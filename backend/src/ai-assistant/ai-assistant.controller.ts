import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { AiAssistantService } from './ai-assistant.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

class ChatDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
export class AiAssistantController {
  constructor(private aiAssistantService: AiAssistantService) {}

  @Post('chat')
  async chat(@Request() req, @Body() chatDto: ChatDto) {
    return this.aiAssistantService.chat(req.user.sub, chatDto.query, chatDto.conversationId);
  }

  @Get('conversations')
  async getConversations(@Request() req, @Query('limit') limit = '20') {
    return this.aiAssistantService.getConversationHistory(req.user.sub, parseInt(limit));
  }

  @Get('conversations/:id')
  async getConversation(@Param('id') id: string, @Request() req) {
    return this.aiAssistantService.getConversation(id, req.user.sub);
  }
}
