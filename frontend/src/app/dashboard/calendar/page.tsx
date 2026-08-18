'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { calendarApi, CalendarEvent } from '@/lib/calendar-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Calendar as CalendarIcon, Clock, MapPin, Video, Trash2 } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO } from 'date-fns';

export default function CalendarPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    isAllDay: false,
  });

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const res = await calendarApi.getEvents(
        monthStart.toISOString(),
        monthEnd.toISOString()
      );
      setEvents(res.data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!formData.title.trim()) {
      alert('Please enter an event title');
      return;
    }
    try {
      await calendarApi.createEvent({
        ...formData,
        startTime: formData.startTime,
        endTime: formData.endTime,
      });
      setShowCreateModal(false);
      setFormData({ title: '', description: '', startTime: '', endTime: '', location: '', isAllDay: false });
      loadEvents();
    } catch (error: any) {
      console.error('Failed to create event:', error);
      alert(error?.response?.data?.message || 'Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await calendarApi.deleteEvent(eventId);
      setSelectedEvent(null);
      loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event');
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setFormData({
      title: '',
      description: '',
      startTime: format(date, "yyyy-MM-dd'T'09:00"),
      endTime: format(date, "yyyy-MM-dd'T'10:00"),
      location: '',
      isAllDay: false,
    });
    setShowCreateModal(true);
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(parseISO(event.startTime), date));
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
    const calendarEnd = new Date(monthEnd);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-[10px] font-bold py-2 text-muted-foreground uppercase tracking-wide">
            {day}
          </div>
        ))}
        {days.map((date) => {
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isToday = isSameDay(date, new Date());
          const dayEvents = getEventsForDate(date);

          return (
            <div
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              className={`min-h-20 p-1.5 border rounded-xl cursor-pointer transition-all duration-100 ${
                isCurrentMonth
                  ? 'bg-card border-border hover:bg-sidebar/50'
                  : 'bg-sidebar/30 border-border/30 text-muted-foreground/40'
              } ${isToday ? 'ring-2 ring-[#6D4C5B] dark:ring-[#D98C9A]' : ''}`}
            >
              <div
                className={`text-[11px] font-bold mb-1 w-5 h-5 rounded-full flex items-center justify-center ${
                  isToday
                    ? 'bg-[#6D4C5B] text-white'
                    : isCurrentMonth
                    ? 'text-foreground'
                    : 'text-muted-foreground/40'
                }`}
              >
                {format(date, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                    }}
                    className="text-[9px] px-1 py-0.5 rounded bg-[#6D4C5B]/15 text-[#6D4C5B] dark:text-[#E8B6BF] truncate font-semibold border border-[#6D4C5B]/20 hover:bg-[#6D4C5B]/25"
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[9px] text-muted-foreground font-medium">+{dayEvents.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#6D4C5B] border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background text-foreground transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="border-border bg-card hover:bg-sidebar text-foreground h-9 px-3 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Team Calendar</h1>
              <p className="text-muted-foreground text-xs">Schedule and manage your workspace events</p>
            </div>
          </div>
          <Button
            onClick={() => {
              const now = new Date();
              setSelectedDate(now);
              setFormData({
                title: '',
                description: '',
                startTime: format(now, "yyyy-MM-dd'T'09:00"),
                endTime: format(now, "yyyy-MM-dd'T'10:00"),
                location: '',
                isAllDay: false,
              });
              setShowCreateModal(true);
            }}
            className="bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white rounded-xl shadow-sm text-xs h-9 px-4"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Event
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <Card className="border border-border bg-card shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[#6D4C5B] dark:text-[#D98C9A]" />
                    {format(currentDate, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                      className="text-xs border-border bg-card hover:bg-sidebar h-8 px-3 rounded-lg"
                    >
                      ← Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date())}
                      className="text-xs border-border bg-[#6D4C5B]/10 text-[#6D4C5B] dark:text-[#D98C9A] hover:bg-[#6D4C5B]/20 h-8 px-3 rounded-lg"
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                      className="text-xs border-border bg-card hover:bg-sidebar h-8 px-3 rounded-lg"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderCalendar()}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <div>
            <Card className="border border-border bg-card shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#A66A7A]" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {events
                    .filter((e) => new Date(e.startTime) >= new Date())
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .slice(0, 6)
                    .map((event) => (
                      <div
                        key={event.id}
                        className="p-3 border border-border rounded-xl hover:bg-sidebar/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#6D4C5B] shrink-0 mt-1" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">{event.title}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {format(parseISO(event.startTime), 'MMM d, h:mm a')}
                            </div>
                            {event.location && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {events.filter((e) => new Date(e.startTime) >= new Date()).length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground font-medium">
                      No upcoming events
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Create Event Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <Card className="w-full max-w-md border border-border bg-card rounded-2xl shadow-2xl p-6">
              <CardHeader className="p-0 pb-4">
                <h3 className="text-base font-bold text-foreground">Create New Event</h3>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Today'}
                </p>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-semibold text-foreground">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Engineering Standup"
                    className="bg-input border-border text-foreground text-xs focus:border-[#A66A7A] h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold text-foreground">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional notes..."
                    className="bg-input border-border text-foreground text-xs focus:border-[#A66A7A] h-10 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="startTime" className="text-xs font-semibold text-foreground">Start Time</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="bg-input border-border text-foreground text-xs focus:border-[#A66A7A] h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endTime" className="text-xs font-semibold text-foreground">End Time</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="bg-input border-border text-foreground text-xs focus:border-[#A66A7A] h-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-xs font-semibold text-foreground">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Virtual Room 1 or Building A"
                    className="bg-input border-border text-foreground text-xs focus:border-[#A66A7A] h-10 rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAllDay"
                    checked={formData.isAllDay}
                    onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                    className="rounded border-border w-4 h-4"
                  />
                  <Label htmlFor="isAllDay" className="text-xs font-semibold text-foreground cursor-pointer">All day event</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateEvent} className="flex-1 bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white text-xs h-10 rounded-xl">
                    Create Event
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1 text-xs h-10 border-border rounded-xl">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <Card className="w-full max-w-md border border-border bg-card rounded-2xl shadow-2xl p-6">
              <CardHeader className="p-0 pb-4">
                <h3 className="text-base font-bold text-foreground">{selectedEvent.title}</h3>
                <p className="text-[10px] text-[#A66A7A] uppercase font-semibold tracking-wide mt-0.5">Calendar Event</p>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>
                    {format(parseISO(selectedEvent.startTime), 'MMM d, h:mm a')} — {format(parseISO(selectedEvent.endTime), 'h:mm a')}
                  </span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="text-xs text-muted-foreground bg-sidebar p-3 rounded-xl border border-border">
                    {selectedEvent.description}
                  </div>
                )}
                {selectedEvent.callId && (
                  <div className="flex items-center gap-2 text-xs text-[#5F8F72]">
                    <Video className="w-4 h-4" />
                    <span>Video call linked to this event</span>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleDeleteEvent(selectedEvent.id);
                    }}
                    className="flex-1 text-xs h-10 border-[#B85C63]/30 bg-[#B85C63]/10 hover:bg-[#B85C63]/25 text-[#B85C63] rounded-xl"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete Event
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedEvent(null)} className="flex-1 text-xs h-10 border-border rounded-xl">
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
