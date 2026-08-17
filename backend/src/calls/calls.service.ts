import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallType, CallStatus } from '@prisma/client';

interface CreateCallDto {
  type: CallType;
  conversationId?: string;
  participantIds: string[];
}

interface JoinCallDto {
  callId: string;
}

interface WebRTCSignalDto {
  callId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  signal: any;
  targetUserId?: string;
}

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) {}

  async createCall(userId: string, createCallDto: CreateCallDto) {
    const { type, conversationId, participantIds } = createCallDto;

    // Create the call record
    const call = await this.prisma.call.create({
      data: {
        type,
        status: CallStatus.INITIATED,
        initiatorId: userId,
        conversationId,
        participants: {
          create: [
            { userId },
            ...participantIds.map((id) => ({ userId: id })),
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
              },
            },
          },
        },
      },
    });

    return call;
  }

  async joinCall(userId: string, joinCallDto: JoinCallDto) {
    const call = await this.prisma.call.findUnique({
      where: { id: joinCallDto.callId },
      include: {
        participants: true,
      },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // Check if user is a participant
    const isParticipant = call.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new NotFoundException('You are not a participant in this call');
    }

    // Update call status if first joiner
    if (call.status === CallStatus.INITIATED) {
      await this.prisma.call.update({
        where: { id: call.id },
        data: {
          status: CallStatus.ONGOING,
          startedAt: new Date(),
        },
      });
    }

    // Update participant join time
    await this.prisma.callParticipant.updateMany({
      where: {
        callId: call.id,
        userId,
        joinedAt: null,
      },
      data: {
        joinedAt: new Date(),
      },
    });

    return {
      call,
      // For WebRTC, we don't need tokens - signaling happens via Socket.IO
      signalingServer: process.env.BACKEND_URL || 'http://localhost:3001',
    };
  }

  async leaveCall(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        participants: true,
      },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // Update participant leave time
    await this.prisma.callParticipant.updateMany({
      where: {
        callId,
        userId,
      },
      data: {
        leftAt: new Date(),
      },
    });

    // Check if all participants have left
    const activeParticipants = await this.prisma.callParticipant.count({
      where: {
        callId,
        leftAt: null,
      },
    });

    if (activeParticipants === 0) {
      // End the call
      const duration = Math.floor(
        (new Date().getTime() - (call.startedAt?.getTime() || new Date().getTime())) / 1000,
      );

      await this.prisma.call.update({
        where: { id: callId },
        data: {
          status: CallStatus.ENDED,
          endedAt: new Date(),
          duration,
        },
      });
    }

    return { success: true };
  }

  async endCall(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // Only initiator can end the call
    if (call.initiatorId !== userId) {
      throw new NotFoundException('Only the call initiator can end the call');
    }

    const duration = call.startedAt
      ? Math.floor((new Date().getTime() - call.startedAt.getTime()) / 1000)
      : 0;

    await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: CallStatus.ENDED,
        endedAt: new Date(),
        duration,
      },
    });

    // Mark all participants as left
    await this.prisma.callParticipant.updateMany({
      where: {
        callId,
        leftAt: null,
      },
      data: {
        leftAt: new Date(),
      },
    });

    return { success: true };
  }

  async getCallHistory(userId: string, limit = 20) {
    return this.prisma.call.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { participants: { some: { userId } } },
        ],
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
        participants: {
          include: {
            user: {
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
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async getCallParticipants(callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                employeeId: true,
              },
            },
          },
        },
      },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return call.participants;
  }
}
