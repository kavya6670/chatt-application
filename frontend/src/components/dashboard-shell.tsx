'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  MessageSquare,
  Video,
  Calendar,
  Bot,
  Users,
  FileText,
  LogOut,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  ShieldAlert,
  Bell,
  Search,
} from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        {
          label: 'Overview',
          href: '/dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      title: 'COMMUNICATION',
      items: [
        {
          label: 'Direct & Group Chat',
          href: '/dashboard/chat',
          icon: MessageSquare,
          badge: 'Live',
        },
        {
          label: 'Audio & Video Calls',
          href: '/dashboard/calls',
          icon: Video,
          badge: 'HD',
        },
        {
          label: 'Team Calendar',
          href: '/dashboard/calendar',
          icon: Calendar,
          badge: null,
        },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        {
          label: 'AI Workspace Assistant',
          href: '/dashboard/ai-assistant',
          icon: Bot,
          badge: 'AI',
        },
        {
          label: 'Employee Directory',
          href: '/dashboard/directory',
          icon: Users,
          badge: null,
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: 'ADMINISTRATION',
            items: [
              {
                label: 'Employee Management',
                href: '/dashboard/admin/employees',
                icon: ShieldAlert,
                badge: 'Admin',
              },
              {
                label: 'Knowledge & Documents',
                href: '/dashboard/admin/documents',
                icon: FileText,
                badge: null,
              },
            ],
          },
        ]
      : []),
  ];

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Executive Dashboard';
    if (pathname.startsWith('/dashboard/chat')) return 'Live Team Chat';
    if (pathname.startsWith('/dashboard/calls')) return 'Audio & Video Conference';
    if (pathname.startsWith('/dashboard/calendar')) return 'Schedule & Calendar';
    if (pathname.startsWith('/dashboard/ai-assistant')) return 'Enterprise AI Assistant';
    if (pathname.startsWith('/dashboard/directory')) return 'Company Directory';
    if (pathname.startsWith('/dashboard/admin/employees')) return 'Employee Administration';
    if (pathname.startsWith('/dashboard/admin/documents')) return 'Document Repository';
    return 'Workspace';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
            S
          </div>
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            Stitch Hub
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/40 text-xs px-2"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Logout
          </Button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between z-40 transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="px-5 py-5 border-b border-slate-800/70 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                S
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  Stitch Hub
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Pro
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Enterprise Workspace</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-210px)]">
            {navSections.map((section, idx) => (
              <div key={idx} className="space-y-1.5">
                <p className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4 h-4 transition-colors ${
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-800 text-indigo-300 border border-slate-700/60'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Card & Log Out */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm">
                  {user?.name ? user.name.slice(0, 2) : 'US'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.employeeId} • <span className="text-indigo-400 font-medium">{user?.role}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Prominent Sidebar Logout Button */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-center text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/30 text-xs py-2 rounded-xl transition-colors font-medium"
          >
            <LogOut className="w-4 h-4 mr-2 text-red-400" />
            Sign Out of Hub
          </Button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white tracking-tight">{getPageTitle()}</h1>
            <span className="text-xs text-slate-500">|</span>
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Workspace Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Link Launcher */}
            <div className="flex items-center gap-2 mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/chat')}
                className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg px-2.5 py-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Quick Chat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/ai-assistant')}
                className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg px-2.5 py-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                Ask AI
              </Button>
            </div>

            {/* Top Header Log Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs border-slate-700 bg-slate-800/70 hover:bg-red-950/50 hover:text-red-300 hover:border-red-800/50 text-slate-200 rounded-lg transition-colors px-3 py-1.5"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5 text-red-400" />
              Log Out
            </Button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
