'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
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
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [quickAiPrompt, setQuickAiPrompt] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

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
      value: '4 Active',
      subtext: 'Engineering, Design, General',
      icon: MessageSquare,
      color: 'from-blue-500/20 to-indigo-500/10 text-indigo-400 border-indigo-500/30',
      actionUrl: '/dashboard/chat',
      actionText: 'Open Chat',
    },
    {
      title: 'WebRTC Calls',
      value: 'HD Ready',
      subtext: 'P2P & Multi-party audio/video',
      icon: Video,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
      actionUrl: '/dashboard/calls',
      actionText: 'Start Call',
    },
    {
      title: 'Team Schedule',
      value: '3 Upcoming',
      subtext: 'Sprint Planning & Standups',
      icon: CalendarIcon,
      color: 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30',
      actionUrl: '/dashboard/calendar',
      actionText: 'View Calendar',
    },
    {
      title: 'AI Intelligence',
      value: 'Online',
      subtext: 'RAG Knowledge Assistant',
      icon: Bot,
      color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
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
      gradient: 'from-indigo-600 to-violet-600',
    },
    {
      title: 'Launch Video Call',
      desc: 'Instant video conference with screen sharing',
      icon: Video,
      href: '/dashboard/calls',
      gradient: 'from-emerald-600 to-teal-600',
    },
    {
      title: 'Schedule Meeting',
      desc: 'Book team sessions and synced calendar events',
      icon: CalendarIcon,
      href: '/dashboard/calendar',
      gradient: 'from-purple-600 to-pink-600',
    },
    {
      title: 'Enterprise AI Assistant',
      desc: 'Query policies, synthesize notes, brainstorm',
      icon: Bot,
      href: '/dashboard/ai-assistant',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Company Directory',
      desc: 'Search team members and department roles',
      icon: Users,
      href: '/dashboard/directory',
      gradient: 'from-blue-600 to-cyan-600',
    },
    ...(isAdmin
      ? [
          {
            title: 'Admin Management',
            desc: 'Manage employees, credentials & permissions',
            icon: ShieldCheck,
            href: '/dashboard/admin/employees',
            gradient: 'from-rose-600 to-red-600',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-purple-950/80 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {user?.role || 'MEMBER'}
              </span>
              <span className="text-xs text-slate-400">
                Employee ID: <strong className="text-white">{user?.employeeId}</strong>
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || 'Colleague'} 👋
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Your unified enterprise hub for seamless messaging, high-definition conferencing,
              smart scheduling, and knowledge AI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => router.push('/dashboard/chat')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 text-xs px-4 py-2"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Open Chat
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-red-900/40 bg-red-950/20 hover:bg-red-950/60 text-red-300 hover:text-red-200 text-xs rounded-xl px-4 py-2"
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
              className={`p-5 rounded-2xl bg-gradient-to-br ${stat.color} border backdrop-blur-md transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300">{stat.title}</span>
                <div className="p-2 rounded-xl bg-slate-900/80">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mb-4">
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{stat.subtext}</p>
              </div>
              <Link
                href={stat.actionUrl}
                className="text-xs font-semibold text-white/90 hover:text-white flex items-center justify-between pt-2 border-t border-white/10 group"
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
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Workspace Quick Launchpad
            </h3>
            <span className="text-xs text-slate-400">Jump straight into action</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <div
                  key={idx}
                  onClick={() => router.push(action.href)}
                  className="glass-card p-5 rounded-2xl cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${action.gradient} flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                        {action.title}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-400" />
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
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
          <div className="glass-card p-6 rounded-2xl border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 to-slate-900/60 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Ask Stitch AI</h4>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Get instant answers about company policies, technical docs, or summarize notes.
            </p>

            <form onSubmit={handleQuickAiSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. What are our deployment steps?"
                  value={quickAiPrompt}
                  onChange={(e) => setQuickAiPrompt(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs py-2 font-medium"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Launch AI Query
              </Button>
            </form>
          </div>

          {/* Upcoming Schedule Mini-Widget */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Upcoming Today
              </h4>
              <Link
                href="/dashboard/calendar"
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Full Calendar
              </Link>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
                <div className="w-2 h-8 rounded-full bg-indigo-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Daily Engineering Standup</p>
                  <p className="text-[10px] text-slate-400">10:00 AM • Main Conference</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
                <div className="w-2 h-8 rounded-full bg-purple-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Sprint Retrospective</p>
                  <p className="text-[10px] text-slate-400">03:30 PM • Team Room</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
