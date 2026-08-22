import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationType } from '@prisma/client';
import { MeetingDetectorService } from './meeting-detector.service';

interface CreateConversationDto {
  type: ConversationType;
  name?: string;
  participantIds: string[];
  departmentId?: string;
}

interface SendMessageDto {
  conversationId: string;
  content: string;
  attachments?: string[];
}

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private meetingDetectorService: MeetingDetectorService,
  ) {}

  async getUserConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                employeeId: true,
                email: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                employeeId: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Count unread messages for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });

        return {
          ...conv,
          unreadCount,
        };
      }),
    );

    return conversationsWithUnread;
  }

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                employeeId: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return conversation;
  }

  async getMessages(conversationId: string, userId: string, limit = 50, offset = 0) {
    // Verify user is participant
    await this.getConversationById(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return messages.reverse();
  }

  async createConversation(userId: string, createConversationDto: CreateConversationDto) {
    const { type, name, participantIds, departmentId } = createConversationDto;

    // For direct conversations, check if one already exists
    if (type === ConversationType.DIRECT && participantIds.length === 1) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: ConversationType.DIRECT,
          participants: {
            every: {
              userId: { in: [userId, ...participantIds] },
            },
          },
        },
        include: {
          participants: true,
        },
      });

      if (existing && existing.participants.length === 2) {
        return existing;
      }
    }

    // Create conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        type,
        name,
        departmentId,
        participants: {
          create: [
            { userId, isAdmin: true }, // Creator is admin
            ...participantIds.map((id) => ({ userId, isAdmin: false })),
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                employeeId: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return conversation;
  }

  async sendMessage(userId: string, sendMessageDto: SendMessageDto) {
    const { conversationId, content, attachments } = sendMessageDto;

    // Verify user is participant
    await this.getConversationById(conversationId, userId);

    const message = await this.prisma.message.create({
      data: {
        content,
        senderId: userId,
        conversationId,
        attachments: attachments || [],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Detect meetings and auto-sync calendar in background
    this.meetingDetectorService
      .processMessageForMeetings(message.id, content, userId, conversationId)
      .catch((err) => console.error('Meeting detection background error:', err));

    return message;
  }

  async markAsRead(conversationId: string, userId: string) {
    // Verify user is participant
    await this.getConversationById(conversationId, userId);

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  async addParticipant(conversationId: string, userId: string, newParticipantId: string) {
    const conversation = await this.getConversationById(conversationId, userId);

    // Check if requester is admin
    const participant = conversation.participants.find((p) => p.userId === userId);
    if (!participant?.isAdmin && conversation.type === ConversationType.GROUP) {
      throw new ForbiddenException('Only conversation admins can add participants');
    }

    // Check if user is already a participant
    const existingParticipant = conversation.participants.find((p) => p.userId === newParticipantId);
    if (existingParticipant) {
      throw new ForbiddenException('User is already a participant');
    }

    await this.prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId: newParticipantId,
        isAdmin: false,
      },
    });

    return { success: true };
  }

  async removeParticipant(conversationId: string, userId: string, participantId: string) {
    const conversation = await this.getConversationById(conversationId, userId);

    // Check if requester is admin or removing themselves
    const participant = conversation.participants.find((p) => p.userId === userId);
    if (!participant?.isAdmin && userId !== participantId) {
      throw new ForbiddenException('Only conversation admins can remove participants');
    }

    await this.prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: participantId,
        },
      },
    });

    return { success: true };
  }
}
