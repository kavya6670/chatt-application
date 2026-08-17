import api from './api';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  userId: string;
  callId?: string;
  location?: string;
  isAllDay: boolean;
  createdAt: string;
  updatedAt: string;
}

export const calendarApi = {
  getEvents: (startDate?: string, endDate?: string) =>
    api.get<CalendarEvent[]>('/calendar/events', {
      params: { startDate, endDate },
    }),

  getUpcomingEvents: (limit = 10) =>
    api.get<CalendarEvent[]>('/calendar/events/upcoming', { params: { limit } }),

  getEvent: (eventId: string) => api.get<CalendarEvent>(`/calendar/events/${eventId}`),

  createEvent: (data: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    isAllDay?: boolean;
    callId?: string;
  }) => api.post<CalendarEvent>('/calendar/events', data),

  updateEvent: (eventId: string, data: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    isAllDay?: boolean;
    callId?: string;
  }) => api.put<CalendarEvent>(`/calendar/events/${eventId}`, data),

  deleteEvent: (eventId: string) => api.delete(`/calendar/events/${eventId}`),
};
