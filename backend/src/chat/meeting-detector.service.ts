import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DetectedMeeting {
  isMeeting: boolean;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  confidence: number;
}

@Injectable()
export class MeetingDetectorService {
  private readonly logger = new Logger(MeetingDetectorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Parses natural language message content to detect meeting intentions, dates, times, and topics.
   */
  detectMeeting(content: string, baseDate: Date = new Date()): DetectedMeeting | null {
    const text = content.trim();
    if (text.length < 5) return null;

    const lower = text.toLowerCase();

    // Meeting intent keywords
    const meetingKeywords = [
      'meeting',
      'meet',
      'sync',
      'standup',
      'huddle',
      'catch up',
      'catchup',
      'call',
      'discussion',
      'demo',
      'retro',
      'retrospective',
      'planning',
      'review',
      '1:1',
      'one on one',
      'appointment',
    ];

    const hasMeetingKeyword = meetingKeywords.some((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lower);
    });

    if (!hasMeetingKeyword) {
      return null;
    }

    // Time detection: e.g., "3pm", "3:30 pm", "15:00", "at 10 am", "at 4"
    const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    let hour = 10; // Default to 10:00 AM if no specific time found
    let minute = 0;
    let timeFound = false;

    if (timeMatch) {
      let rawHour = parseInt(timeMatch[1], 10);
      const rawMin = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();

      if (rawHour >= 1 && rawHour <= 24) {
        if (meridiem === 'pm' && rawHour < 12) {
          rawHour += 12;
        } else if (meridiem === 'am' && rawHour === 12) {
          rawHour = 0;
        } else if (!meridiem && rawHour >= 1 && rawHour <= 6) {
          // Typically afternoon if 1-6 without AM/PM
          rawHour += 12;
        }
        hour = rawHour;
        minute = rawMin;
        timeFound = true;
      }
    }

    // Date detection: today, tomorrow, day of week, or specific date
    const targetDate = new Date(baseDate);
    targetDate.setHours(hour, minute, 0, 0);

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let dateFound = false;

    if (lower.includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
      dateFound = true;
    } else if (lower.includes('today') || lower.includes('tonight')) {
      // Keep today
      dateFound = true;
    } else {
      // Check day of week
      for (let i = 0; i < daysOfWeek.length; i++) {
        const dayName = daysOfWeek[i];
        if (lower.includes(dayName)) {
          const currentDay = targetDate.getDay();
          let diff = i - currentDay;
          if (diff <= 0) diff += 7; // Next occurrence
          targetDate.setDate(targetDate.getDate() + diff);
          dateFound = true;
          break;
        }
      }
    }

    // If neither explicit date nor explicit time found, don't create false positives
    if (!timeFound && !dateFound) {
      return null;
    }

    // End time is default 45 mins to 1 hour later
    const endDate = new Date(targetDate);
    endDate.setHours(targetDate.getHours() + 1);

    // Extract title topic from message
    let title = 'Team Meeting';
    if (lower.includes('standup')) title = 'Daily Standup Sync';
    else if (lower.includes('sprint') || lower.includes('planning')) title = 'Sprint Planning Sync';
    else if (lower.includes('retro')) title = 'Sprint Retrospective';
    else if (lower.includes('demo')) title = 'Feature Demo & Review';
    else if (lower.includes('1:1') || lower.includes('one on one')) title = '1-on-1 Sync';
    else if (lower.includes('project') || lower.includes('roadmap')) title = 'Project Roadmap Discussion';
    else {
      // Clean up message to make a concise title
      const clean = text
        .replace(/^(hey|hi|hello|let's|lets|can we|could we|we should|please)\s+/i, '')
        .slice(0, 40);
      title = clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    // Location detection
    let location = 'Stitch LiveKit Room';
    if (lower.includes('room a') || lower.includes('conference room a')) location = 'Conference Room A';
    else if (lower.includes('room b') || lower.includes('conference room b')) location = 'Conference Room B';
    else if (lower.includes('huddle')) location = 'Virtual Huddle';

    return {
      isMeeting: true,
      title,
      startTime: targetDate,
      endTime: endDate,
      location,
      confidence: timeFound && dateFound ? 0.95 : 0.75,
    };
  }

  /**
   * Process a sent chat message, detect if a meeting was agreed/mentioned,
   * and automatically sync calendar events for all conversation participants.
   */
  async processMessageForMeetings(
    messageId: string,
    content: string,
    senderId: string,
    conversationId: string,
  ) {
    try {
      const detected = this.detectMeeting(content);
      if (!detected) return null;

      // Find all participants in this conversation
      const participants = await this.prisma.conversationParticipant.findMany({
        where: { conversationId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (participants.length === 0) return null;

      const createdEvents = [];

      // Create CalendarEvent for each participant if not already present within same time slot
      for (const p of participants) {
        // Prevent duplicate events within 30 min window with similar title
        const existing = await this.prisma.calendarEvent.findFirst({
          where: {
            userId: p.userId,
            startTime: {
              gte: new Date(detected.startTime.getTime() - 15 * 60 * 1000),
              lte: new Date(detected.startTime.getTime() + 15 * 60 * 1000),
            },
            title: detected.title,
          },
        });

        if (!existing) {
          const event = await this.prisma.calendarEvent.create({
            data: {
              userId: p.userId,
              title: detected.title,
              description: `Auto-scheduled from chat conversation: "${content.slice(0, 100)}"`,
              startTime: detected.startTime,
              endTime: detected.endTime,
              location: detected.location,
            },
          });
          createdEvents.push(event);
        }
      }

      this.logger.log(
        `Auto-synced meeting "${detected.title}" for ${createdEvents.length} participants from conversation ${conversationId}`,
      );

      return {
        detected,
        createdEventsCount: createdEvents.length,
      };
    } catch (error) {
      this.logger.error('Failed to process message for meetings:', error);
      return null;
    }
  }
}
