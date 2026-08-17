import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

class CreateEventDto {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay?: boolean;
  callId?: string;
}

class UpdateEventDto {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  isAllDay?: boolean;
  callId?: string;
}

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get('events')
  async getEvents(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.calendarService.getEvents(
      req.user.sub,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('events/upcoming')
  async getUpcomingEvents(@Request() req, @Query('limit') limit = '10') {
    return this.calendarService.getUpcomingEvents(req.user.sub, parseInt(limit));
  }

  @Get('events/:id')
  async getEvent(@Param('id') id: string, @Request() req) {
    return this.calendarService.getEventById(id, req.user.sub);
  }

  @Post('events')
  async createEvent(@Request() req, @Body() createEventDto: CreateEventDto) {
    return this.calendarService.createEvent(req.user.sub, {
      ...createEventDto,
      startTime: new Date(createEventDto.startTime),
      endTime: new Date(createEventDto.endTime),
    });
  }

  @Put('events/:id')
  async updateEvent(
    @Param('id') id: string,
    @Request() req,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    const data: any = { ...updateEventDto };
    if (updateEventDto.startTime) data.startTime = new Date(updateEventDto.startTime);
    if (updateEventDto.endTime) data.endTime = new Date(updateEventDto.endTime);
    
    return this.calendarService.updateEvent(id, req.user.sub, data);
  }

  @Delete('events/:id')
  async deleteEvent(@Param('id') id: string, @Request() req) {
    return this.calendarService.deleteEvent(id, req.user.sub);
  }
}
