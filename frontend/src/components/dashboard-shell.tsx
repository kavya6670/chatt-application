'use client';

import { useState, useEffect } from 'react';
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
  Sun,
  Moon,
} from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

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
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6D4C5B] via-[#A66A7A] to-[#D98C9A] flex items-center justify-center font-bold text-white shadow-md">
            S
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">
            Stitch Hub
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground px-2"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-[#B85C63] hover:bg-[#B85C63]/10 text-xs px-2"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Logout
          </Button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-card text-muted-foreground hover:text-foreground border border-border"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-sidebar border-r border-border flex flex-col justify-between z-40 transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="px-5 py-5 border-b border-border flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6D4C5B] via-[#A66A7A] to-[#D98C9A] flex items-center justify-center font-black text-white shadow-lg group-hover:scale-105 transition-transform">
                S
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                  Stitch Hub
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-[#D98C9A]/20 text-[#6D4C5B] dark:text-[#E8B6BF] border border-[#D98C9A]/30">
                    Pro
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Enterprise Workspace</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-270px)]">
            {navSections.map((section, idx) => (
              <div key={idx} className="space-y-1.5">
                <p className="px-3 text-[10px] font-bold tracking-wider text-[#766B70] uppercase">
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
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group border-l-4 ${
                          isActive
                            ? 'bg-[#E3D2D8] dark:bg-[#6D4C5B]/20 border-[#6D4C5B] text-foreground font-semibold shadow-sm'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-[#E8DCE0] dark:hover:bg-[#352B30]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4 h-4 transition-colors ${
                              isActive ? 'text-[#6D4C5B] dark:text-[#D98C9A]' : 'text-muted-foreground group-hover:text-[#6D4C5B] dark:group-hover:text-[#D98C9A]'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${
                              isActive
                                ? 'bg-[#6D4C5B] text-white'
                                : 'bg-card text-[#6D4C5B] dark:text-[#D98C9A] border border-border'
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
        <div className="p-3 border-t border-border bg-sidebar/50 space-y-2">
          {/* Quick Theme Toggle inside sidebar bottom */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-card border border-border">
            <span className="text-[11px] font-medium text-muted-foreground">App Theme</span>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-sidebar text-muted-foreground hover:text-foreground transition-all"
            >
              {theme === 'light' ? (
                <div className="flex items-center gap-1 text-[11px]">
                  <Moon className="w-3.5 h-3.5 text-[#6D4C5B]" />
                  <span>Dark</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px]">
                  <Sun className="w-3.5 h-3.5 text-[#D98C9A]" />
                  <span>Light</span>
                </div>
              )}
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6D4C5B] to-[#A66A7A] flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm">
                  {user?.name ? user.name.slice(0, 2) : 'US'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#5F8F72] ring-2 ring-sidebar" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.employeeId} • <span className="text-[#A66A7A] font-semibold">{user?.role}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Prominent Sidebar Logout Button */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-center text-[#B85C63] hover:bg-[#B85C63]/10 border border-[#B85C63]/30 text-xs py-2 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-4 h-4 mr-2 text-[#B85C63]" />
            Sign Out of Hub
          </Button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-background border-b border-border sticky top-0 z-30 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground tracking-tight">{getPageTitle()}</h1>
            <span className="text-xs text-border">|</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5F8F72] animate-pulse" />
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
                className="text-xs text-foreground hover:bg-sidebar rounded-lg px-2.5 py-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-[#6D4C5B] dark:text-[#D98C9A]" />
                Quick Chat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/ai-assistant')}
                className="text-xs text-foreground hover:bg-sidebar rounded-lg px-2.5 py-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#A66A7A] dark:text-[#E8B6BF]" />
                Ask AI
              </Button>
            </div>

            {/* Top Header Log Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs border-border bg-card hover:bg-[#B85C63]/10 hover:text-[#B85C63] hover:border-[#B85C63]/50 text-foreground rounded-lg transition-all px-3 py-1.5"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5 text-[#B85C63]" />
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
