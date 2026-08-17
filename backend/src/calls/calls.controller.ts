import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CallType } from '@prisma/client';

class CreateCallDto {
  type: CallType;
  conversationId?: string;
  participantIds: string[];
}

class JoinCallDto {
  callId: string;
}

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Post()
  async createCall(@Request() req, @Body() createCallDto: CreateCallDto) {
    return this.callsService.createCall(req.user.sub, createCallDto);
  }

  @Post('join')
  async joinCall(@Request() req, @Body() joinCallDto: JoinCallDto) {
    return this.callsService.joinCall(req.user.sub, joinCallDto);
  }

  @Post(':id/leave')
  async leaveCall(@Param('id') id: string, @Request() req) {
    return this.callsService.leaveCall(req.user.sub, id);
  }

  @Post(':id/end')
  async endCall(@Param('id') id: string, @Request() req) {
    return this.callsService.endCall(req.user.sub, id);
  }

  @Get('history')
  async getCallHistory(@Request() req, @Query('limit') limit = '20') {
    return this.callsService.getCallHistory(req.user.sub, parseInt(limit));
  }

  @Get(':id')
  async getCall(@Param('id') id: string, @Request() req) {
    // This would return call details
    // Implementation depends on requirements
    return { message: 'Get call details' };
  }
}
