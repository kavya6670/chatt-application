import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.connectedUsers.set(client.id, userId);
      client.data.userId = userId;

      // Join user's personal room for notifications
      client.join(`user:${userId}`);

      // Get user's conversations and join those rooms
      const conversations = await this.chatService.getUserConversations(userId);
      conversations.forEach((conv) => {
        client.join(`conversation:${conv.id}`);
      });

      // Notify others that user is online
      this.server.emit('user:online', { userId });
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      this.connectedUsers.delete(client.id);
      this.server.emit('user:offline', { userId });
    }
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      await this.chatService.getConversationById(data.conversationId, userId);
      client.join(`conversation:${data.conversationId}`);
      
      // Notify others in the conversation
      client.to(`conversation:${data.conversationId}`).emit('user:joined', {
        userId,
        conversationId: data.conversationId,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    
    // Notify others in the conversation
    client.to(`conversation:${data.conversationId}`).emit('user:left', {
      userId: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('send:message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; attachments?: string[] },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const message = await this.chatService.sendMessage(userId, {
        conversationId: data.conversationId,
        content: data.content,
        attachments: data.attachments,
      });

      // Broadcast to all participants in the conversation
      this.server.to(`conversation:${data.conversationId}`).emit('message:new', message);
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      await this.chatService.markAsRead(data.conversationId, userId);
      
      // Notify sender that messages were read
      client.to(`conversation:${data.conversationId}`).emit('messages:read', {
        userId,
        conversationId: data.conversationId,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to mark messages as read' });
    }
  }

  // WebRTC Signaling Handlers
  @SubscribeMessage('webrtc:offer')
  async handleWebRTCOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; offer: any; targetUserId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // Send offer to target user
    this.server.to(`user:${data.targetUserId}`).emit('webrtc:offer', {
      callId: data.callId,
      offer: data.offer,
      fromUserId: userId,
    });
  }

  @SubscribeMessage('webrtc:answer')
  async handleWebRTCAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; answer: any; targetUserId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // Send answer to target user
    this.server.to(`user:${data.targetUserId}`).emit('webrtc:answer', {
      callId: data.callId,
      answer: data.answer,
      fromUserId: userId,
    });
  }

  @SubscribeMessage('webrtc:ice-candidate')
  async handleWebRTCIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; candidate: any; targetUserId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // Send ICE candidate to target user
    this.server.to(`user:${data.targetUserId}`).emit('webrtc:ice-candidate', {
      callId: data.callId,
      candidate: data.candidate,
      fromUserId: userId,
    });
  }

  @SubscribeMessage('webrtc:join-call')
  async handleWebRTCJoinCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // Join call room for signaling
    client.join(`call:${data.callId}`);
    
    // Notify others in the call
    client.to(`call:${data.callId}`).emit('webrtc:user-joined', {
      callId: data.callId,
      userId,
    });
  }

  @SubscribeMessage('webrtc:leave-call')
  async handleWebRTCLeaveCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // Leave call room
    client.leave(`call:${data.callId}`);
    
    // Notify others in the call
    client.to(`call:${data.callId}`).emit('webrtc:user-left', {
      callId: data.callId,
      userId,
    });
  }
}
