'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, MessageSquare, Video, FileText, Bot, Settings, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted) {
    return null;
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stitch Enterprise</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Welcome, {user?.name} ({user?.employeeId})
            </p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {isAdmin ? 'Admin Panel - Manage your organization' : 'Your workspace'}
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Chat */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/chat')}>
            <CardHeader>
              <MessageSquare className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>Chat</CardTitle>
              <CardDescription>Send messages to colleagues</CardDescription>
            </CardHeader>
          </Card>

          {/* Calls */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/calls')}>
            <Video className="w-8 h-8 text-green-600 mb-2" />
            <CardHeader>
              <CardTitle>Calls</CardTitle>
              <CardDescription>Audio and video meetings</CardDescription>
            </CardHeader>
          </Card>

          {/* Calendar */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/calendar')}>
            <Calendar className="w-8 h-8 text-purple-600 mb-2" />
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>Manage your schedule</CardDescription>
            </CardHeader>
          </Card>

          {/* AI Assistant */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/ai-assistant')}>
            <Bot className="w-8 h-8 text-orange-600 mb-2" />
            <CardHeader>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>Ask company-related questions</CardDescription>
            </CardHeader>
          </Card>

          {/* Employee Directory - Admin Only */}
          {isAdmin && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/admin/employees')}>
              <Users className="w-8 h-8 text-red-600 mb-2" />
              <CardHeader>
                <CardTitle>Employees</CardTitle>
                <CardDescription>Manage team members</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Knowledge Base - Admin Only */}
          {isAdmin && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/admin/knowledge-base')}>
              <FileText className="w-8 h-8 text-indigo-600 mb-2" />
              <CardHeader>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>Manage company documents</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Profile */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/profile')}>
            <Settings className="w-8 h-8 text-gray-600 mb-2" />
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* User Info Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Name:</span>
                <span className="ml-2 font-medium">{user?.name}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Employee ID:</span>
                <span className="ml-2 font-medium">{user?.employeeId}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <span className="ml-2 font-medium">{user?.email}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Role:</span>
                <span className="ml-2 font-medium capitalize">{user?.role?.toLowerCase()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
