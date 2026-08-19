import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConversationType } from '@prisma/client';

import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';

class CreateConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType;

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  participantIds: string[];

  @IsString()
  @IsOptional()
  departmentId?: string;
}

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsOptional()
  attachments?: string[];
}

import { ChatGateway } from './chat.gateway';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  async getConversations(@Request() req) {
    return this.chatService.getUserConversations(req.user.sub);
  }

  @Get('conversations/:id')
  async getConversation(@Param('id') id: string, @Request() req) {
    return this.chatService.getConversationById(id, req.user.sub);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Request() req,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    return this.chatService.getMessages(
      id,
      req.user.sub,
      parseInt(limit),
      parseInt(offset),
    );
  }

  @Post('conversations')
  async createConversation(@Request() req, @Body() createConversationDto: CreateConversationDto) {
    return this.chatService.createConversation(req.user.sub, createConversationDto);
  }

  @Post('messages')
  async sendMessage(@Request() req, @Body() sendMessageDto: SendMessageDto) {
    const message = await this.chatService.sendMessage(req.user.sub, sendMessageDto);
    try {
      if (this.chatGateway.server) {
        this.chatGateway.server.to(`conversation:${sendMessageDto.conversationId}`).emit('message:new', message);
      }
    } catch (e) {
      // non-critical socket notification failure
    }
    return message;
  }

  @Put('conversations/:id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.chatService.markAsRead(id, req.user.sub);
  }

  @Post('conversations/:id/participants')
  async addParticipant(
    @Param('id') id: string,
    @Request() req,
    @Body('userId') userId: string,
  ) {
    return this.chatService.addParticipant(id, req.user.sub, userId);
  }

  @Delete('conversations/:id/participants/:userId')
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.chatService.removeParticipant(id, req.user.sub, userId);
  }
}
