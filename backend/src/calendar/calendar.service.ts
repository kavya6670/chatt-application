import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateEventDto {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isAllDay?: boolean;
  callId?: string;
}

interface UpdateEventDto {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  isAllDay?: boolean;
  callId?: string;
}

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async getEvents(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = { userId };

    if (startDate && endDate) {
      where.startTime = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.calendarEvent.findMany({
      where,
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async getEventById(eventId: string, userId: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user owns the event or is admin
    // For now, only allow users to see their own events
    if (event.userId !== userId) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async createEvent(userId: string, createEventDto: CreateEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        ...createEventDto,
        userId,
      },
    });
  }

  async updateEvent(eventId: string, userId: string, updateEventDto: UpdateEventDto) {
    // Verify ownership
    await this.getEventById(eventId, userId);

    return this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateEventDto,
    });
  }

  async deleteEvent(eventId: string, userId: string) {
    // Verify ownership
    await this.getEventById(eventId, userId);

    await this.prisma.calendarEvent.delete({
      where: { id: eventId },
    });

    return { success: true };
  }

  async getUpcomingEvents(userId: string, limit = 10) {
    const now = new Date();
    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: {
          gte: now,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: limit,
    });
  }
}
