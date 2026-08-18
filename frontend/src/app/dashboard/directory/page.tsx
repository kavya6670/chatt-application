'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { usersApi } from '@/lib/users-api';
import { departmentsApi, Department } from '@/lib/departments-api';
import { User } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Search, MessageSquare, Video, Phone, User as UserIcon } from 'lucide-react';

export default function DirectoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = users.filter((u) => u.id !== user?.id);

    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterDepartment) {
      filtered = filtered.filter((u) => u.departmentId === filterDepartment);
    }

    if (filterRole) {
      filtered = filtered.filter((u) => u.role === filterRole);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterDepartment, filterRole, user]);

  const loadData = async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        usersApi.getAllUsers({ isActive: true }),
        departmentsApi.getAllDepartments(),
      ]);
      setUsers(usersRes.data);
      setFilteredUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startChat = (userId: string) => {
    router.push(`/dashboard/chat?userId=${userId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#6D4C5B] border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Loading employee directory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background text-foreground transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
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
            <h1 className="text-xl font-bold text-foreground">Employee Directory</h1>
            <p className="text-muted-foreground text-xs font-medium">Find and connect with company colleagues</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border border-border bg-card shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs bg-input border-border focus:border-[#A66A7A]"
                />
              </div>
              <div>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-input px-3 py-2 text-xs focus:border-[#A66A7A] focus:outline-none text-foreground"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-input px-3 py-2 text-xs focus:border-[#A66A7A] focus:outline-none text-foreground"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="DEVELOPER">Developer</option>
                  <option value="FINANCE">Finance</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((userItem) => (
            <Card key={userItem.id} className="border border-border bg-card hover:shadow-md transition-all rounded-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6D4C5B] to-[#A66A7A] flex items-center justify-center text-white font-bold text-sm shadow-sm uppercase shrink-0">
                    {userItem.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-bold text-foreground truncate">{userItem.name}</CardTitle>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{userItem.employeeId}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-[#6D4C5B] dark:text-[#D98C9A]" />
                    <span className="font-semibold text-foreground">{userItem.department?.name || 'General Staff'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="capitalize text-[10px] px-2 py-0.5 rounded bg-sidebar border border-border text-foreground font-semibold">
                      {userItem.role.toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8 border-border hover:bg-[#E8DCE0] dark:hover:bg-[#352B30] text-[#6D4C5B] dark:text-[#D98C9A] rounded-lg"
                    onClick={() => startChat(userItem.id)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    Message
                  </Button>
                  <Button size="sm" variant="outline" disabled className="h-8 w-8 p-0 border-border text-muted-foreground rounded-lg">
                    <Phone className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" disabled className="h-8 w-8 p-0 border-border text-muted-foreground rounded-lg">
                    <Video className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card className="text-center py-12 border border-border bg-card rounded-2xl">
            <CardContent>
              <UserIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-xs text-muted-foreground font-medium">No employees found matching the filters.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
