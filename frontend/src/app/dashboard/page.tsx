'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { calendarApi, CalendarEvent } from '@/lib/calendar-api';
import { chatApi } from '@/lib/chat-api';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Video,
  Calendar as CalendarIcon,
  Bot,
  Users,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Plus,
  Clock,
  Send,
  LogOut,
  ChevronRight,
  CalendarCheck,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [quickAiPrompt, setQuickAiPrompt] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [conversationsCount, setConversationsCount] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    setMounted(true);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [eventsRes, convRes] = await Promise.allSettled([
        calendarApi.getUpcomingEvents(4),
        chatApi.getConversations(),
      ]);

      if (eventsRes.status === 'fulfilled') {
        setUpcomingEvents(eventsRes.value.data);
      }
      if (convRes.status === 'fulfilled') {
        setConversationsCount(convRes.value.data.length);
      }
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  if (!mounted) return null;

  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleQuickAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickAiPrompt.trim()) {
      router.push(`/dashboard/ai-assistant?prompt=${encodeURIComponent(quickAiPrompt)}`);
    } else {
      router.push('/dashboard/ai-assistant');
    }
  };

  const statCards = [
    {
      title: 'Realtime Channels',
      value: conversationsCount > 0 ? `${conversationsCount} Active` : 'Active',
      subtext: '1:1 Chats & Group Channels',
      icon: MessageSquare,
      color: 'from-[#6D4C5B]/20 to-[#6D4C5B]/5 text-[#6D4C5B] dark:text-[#E8B6BF] border-[#6D4C5B]/30',
      actionUrl: '/dashboard/chat',
      actionText: 'Open Chat',
    },
    {
      title: 'WebRTC Calls',
      value: 'HD Ready',
      subtext: 'P2P & Multi-party audio/video',
      icon: Video,
      color: 'from-[#5F8F72]/20 to-[#5F8F72]/5 text-[#5F8F72] border-[#5F8F72]/30',
      actionUrl: '/dashboard/calls',
      actionText: 'Start Call',
    },
    {
      title: 'Team Schedule',
      value: `${upcomingEvents.length} Upcoming`,
      subtext: upcomingEvents.length > 0 ? upcomingEvents[0].title : 'Synced with chats & AI',
      icon: CalendarIcon,
      color: 'from-[#A66A7A]/20 to-[#A66A7A]/5 text-[#A66A7A] border-[#A66A7A]/30',
      actionUrl: '/dashboard/calendar',
      actionText: 'View Calendar',
    },
    {
      title: 'AI Intelligence',
      value: 'Chat Aware',
      subtext: 'Scans 1:1, groups & calendar',
      icon: Bot,
      color: 'from-[#C49A5A]/20 to-[#C49A5A]/5 text-[#C49A5A] border-[#C49A5A]/30',
      actionUrl: '/dashboard/ai-assistant',
      actionText: 'Ask AI',
    },
  ];

  const quickActions = [
    {
      title: 'Start Live Chat',
      desc: 'Send messages & collaborate with colleagues',
      icon: MessageSquare,
      href: '/dashboard/chat',
      gradient: 'from-[#6D4C5B] to-[#5B3D4A]',
    },
    {
      title: 'Launch Video Call',
      desc: 'Instant video conference with screen sharing',
      icon: Video,
      href: '/dashboard/calls',
      gradient: 'from-[#5F8F72] to-[#466B54]',
    },
    {
      title: 'Schedule Meeting',
      desc: 'Book team sessions and synced calendar events',
      icon: CalendarIcon,
      href: '/dashboard/calendar',
      gradient: 'from-[#A66A7A] to-[#91596A]',
    },
    {
      title: 'Enterprise AI Assistant',
      desc: 'Query policies, synthesize notes, brainstorm',
      icon: Bot,
      href: '/dashboard/ai-assistant',
      gradient: 'from-[#C49A5A] to-[#A37B43]',
    },
    {
      title: 'Company Directory',
      desc: 'Search team members and department roles',
      icon: Users,
      href: '/dashboard/directory',
      gradient: 'from-[#6D4C5B] to-[#A66A7A]',
    },
    ...(isAdmin
      ? [
          {
            title: 'Admin Management',
            desc: 'Manage employees, credentials & permissions',
            icon: ShieldCheck,
            href: '/dashboard/admin/employees',
            gradient: 'from-[#B85C63] to-[#9E4A50]',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6D4C5B]/10 via-card to-[#A66A7A]/10 border border-border p-6 md:p-8 shadow-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#6D4C5B]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#6D4C5B]/10 text-[#6D4C5B] dark:text-[#E8B6BF] border border-[#6D4C5B]/30">
                {user?.role || 'MEMBER'}
              </span>
              <span className="text-xs text-muted-foreground">
                Employee ID: <strong className="text-foreground">{user?.employeeId}</strong>
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Welcome back, {user?.name || 'Colleague'} 👋
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Your unified enterprise hub for seamless messaging, high-definition conferencing,
              smart scheduling, and knowledge AI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => router.push('/dashboard/chat')}
              className="bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white rounded-xl shadow-lg shadow-[#6D4C5B]/20 text-xs px-4 py-2"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Open Chat
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-[#B85C63]/30 bg-[#B85C63]/10 hover:bg-[#B85C63]/25 text-[#B85C63] text-xs rounded-xl px-4 py-2"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl bg-gradient-to-br ${stat.color} border border-border/40 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground">{stat.title}</span>
                <div className="p-2 rounded-xl bg-card border border-border/60">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mb-4">
                <div className="text-2xl font-black text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{stat.subtext}</p>
              </div>
              <Link
                href={stat.actionUrl}
                className="text-xs font-semibold text-foreground/90 hover:text-[#6D4C5B] dark:hover:text-[#D98C9A] flex items-center justify-between pt-2 border-t border-border/60 group"
              >
                <span>{stat.actionText}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Launchpad + AI Assistant Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Quick Action Launchpad */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#6D4C5B] dark:text-[#D98C9A]" />
              Workspace Quick Launchpad
            </h3>
            <span className="text-xs text-muted-foreground">Jump straight into action</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <div
                  key={idx}
                  onClick={() => router.push(action.href)}
                  className="glass-card p-5 rounded-2xl cursor-pointer transition-all duration-150 group border border-border"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${action.gradient} flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-[#6D4C5B] dark:group-hover:text-[#D98C9A] transition-colors flex items-center justify-between">
                        {action.title}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#6D4C5B] dark:text-[#D98C9A]" />
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {action.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: AI Assistant Quick Prompter & Schedule Preview */}
        <div className="space-y-6">
          {/* AI Quick Query Card */}
          <div className="bg-card p-6 rounded-2xl border border-border bg-gradient-to-b from-[#6D4C5B]/5 to-transparent shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#6D4C5B] flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Ask Stitch AI</h4>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Get instant answers about company policies, technical docs, or summarize notes.
            </p>

            <form onSubmit={handleQuickAiSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. What are our deployment steps?"
                  value={quickAiPrompt}
                  onChange={(e) => setQuickAiPrompt(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[#A66A7A] focus:ring-1 focus:ring-[#A66A7A]"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white rounded-xl text-xs py-2 font-medium"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Launch AI Query
              </Button>
            </form>
          </div>

          {/* Upcoming Schedule Mini-Widget */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#A66A7A]" />
                Upcoming Schedule
              </h4>
              <Link
                href="/dashboard/calendar"
                className="text-[11px] font-semibold text-[#6D4C5B] dark:text-[#D98C9A] hover:text-[#5B3D4A]"
              >
                Full Calendar
              </Link>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="p-4 rounded-xl bg-background/50 border border-border text-center space-y-2">
                <CalendarCheck className="w-6 h-6 text-muted-foreground/60 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  No upcoming meetings right now.
                </p>
                <Link
                  href="/dashboard/calendar"
                  className="inline-block text-[11px] font-medium text-[#6D4C5B] dark:text-[#D98C9A] hover:underline"
                >
                  + Add an event
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingEvents.slice(0, 3).map((event, idx) => {
                  const startTime = new Date(event.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const dateStr = new Date(event.startTime).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={event.id || idx}
                      onClick={() => router.push('/dashboard/calendar')}
                      className="p-3 rounded-xl bg-background border border-border flex items-center gap-3 cursor-pointer hover:border-[#6D4C5B]/40 transition-colors"
                    >
                      <div
                        className={`w-2 h-8 rounded-full ${
                          idx % 2 === 0 ? 'bg-[#6D4C5B]' : 'bg-[#A66A7A]'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {event.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {dateStr} • {startTime} {event.location ? `• ${event.location}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
