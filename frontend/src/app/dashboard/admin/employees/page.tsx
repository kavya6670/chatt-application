'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { usersApi } from '@/lib/users-api';
import { departmentsApi, Department } from '@/lib/departments-api';
import { User } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Edit, Trash2, Key, Search, AlertCircle } from 'lucide-react';

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'DEVELOPER',
    departmentId: '',
  });

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [user, router]);

  useEffect(() => {
    let filtered = users;

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
  }, [users, searchTerm, filterDepartment, filterRole]);

  const loadData = async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        usersApi.getAllUsers(),
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

  const generateEmployeeId = (departmentSlug: string) => {
    const prefix = departmentSlug.substring(0, 3).toUpperCase();
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}${random}`;
  };

  const generateTempPassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleCreateUser = async () => {
    try {
      const tempPwd = generateTempPassword();
      const selectedDept = departments.find((d) => d.id === formData.departmentId);
      const empId = generateEmployeeId(selectedDept?.slug || 'GEN');

      await usersApi.createUser({
        employeeId: empId,
        email: formData.email,
        name: formData.name,
        password: tempPwd,
        role: formData.role as any,
        departmentId: formData.departmentId,
      });

      setTempPassword(tempPwd);
      setShowTempPassword(true);
      setShowCreateModal(false);
      setFormData({ name: '', email: '', role: 'DEVELOPER', departmentId: '' });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      await usersApi.updateUser(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role as any,
        departmentId: formData.departmentId,
      });

      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', role: 'DEVELOPER', departmentId: '' });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await usersApi.deleteUser(userId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const tempPwd = generateTempPassword();
      alert(`Temporary password for user: ${tempPwd}\n(In production, this would be sent via email)`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await usersApi.deactivateUser(userId);
      } else {
        await usersApi.activateUser(userId);
      }
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });
    setShowEditModal(true);
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
              <h1 className="text-xl font-bold text-foreground">Employee Administration</h1>
              <p className="text-muted-foreground text-xs">Manage workspace profiles, roles, and security credentials</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white rounded-xl shadow-sm text-xs h-9 px-4"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Employee
          </Button>
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

        {/* Users Table */}
        <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-sidebar/20 text-muted-foreground text-xs font-semibold">
                  <th className="py-3.5 px-6">Employee ID</th>
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Department</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filteredUsers.map((emp) => (
                  <tr key={emp.id} className="hover:bg-sidebar/30 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-foreground font-semibold">{emp.employeeId}</td>
                    <td className="py-3.5 px-6 font-semibold text-foreground">{emp.name}</td>
                    <td className="py-3.5 px-6 text-muted-foreground">{emp.email}</td>
                    <td className="py-3.5 px-6 text-foreground">{emp.department?.name || 'General'}</td>
                    <td className="py-3.5 px-6">
                      <span className="px-2 py-0.5 rounded bg-sidebar border border-border text-foreground font-medium text-[10px] capitalize">
                        {emp.role.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.isActive
                            ? 'bg-[#5F8F72]/15 text-[#5F8F72] border border-[#5F8F72]/30'
                            : 'bg-[#B85C63]/15 text-[#B85C63] border border-[#B85C63]/30'
                        }`}
                      >
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(emp)}
                          className="h-8 w-8 p-0 text-[#6D4C5B] hover:bg-[#E8DCE0] dark:text-[#D98C9A] dark:hover:bg-[#352B30] rounded-lg"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetPassword(emp.id)}
                          className="h-8 w-8 p-0 text-[#A66A7A] hover:bg-[#E8DCE0] dark:hover:bg-[#352B30] rounded-lg"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(emp.id, !!emp.isActive)}
                          className={`h-8 px-2 text-[10px] font-semibold rounded-lg ${
                            emp.isActive 
                              ? 'text-[#B85C63] hover:bg-[#B85C63]/10' 
                              : 'text-[#5F8F72] hover:bg-[#5F8F72]/10'
                          }`}
                        >
                          {emp.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteUser(emp.id)}
                          className="h-8 w-8 p-0 text-[#B85C63] hover:bg-[#B85C63]/10 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No matching employee records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <Card className="w-full max-w-md border border-border bg-card rounded-2xl shadow-2xl p-6">
              <CardHeader className="p-0 pb-4">
                <h3 className="text-base font-bold text-foreground">Add New Employee</h3>
                <p className="text-muted-foreground text-xs">Create a new corporate account credentials</p>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-foreground">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-input border-border text-foreground text-xs focus:border-[#A66A7A] h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-input border-border text-foreground text-xs focus:border-[#A66A7A] h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs font-semibold text-foreground">Department</Label>
                  <select
                    id="department"
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full h-10 rounded-xl border border-border bg-input px-3 py-2 text-xs focus:border-[#A66A7A] focus:outline-none text-foreground"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs font-semibold text-foreground">Access Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-10 rounded-xl border border-border bg-input px-3 py-2 text-xs focus:border-[#A66A7A] focus:outline-none text-foreground"
                    required
                  >
                    <option value="DEVELOPER">Developer</option>
                    <option value="FINANCE">Finance</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateUser} className="flex-1 bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white text-xs h-10 rounded-xl">
                    Create Employee
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1 text-xs h-10 border-border rounded-xl">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <Card className="w-full max-w-md border border-border bg-card rounded-2xl shadow-2xl p-6">
              <CardHeader className="p-0 pb-4">
                <h3 className="text-base font-bold text-foreground">Edit Employee</h3>
                <p className="text-muted-foreground text-xs">Update account settings & privileges</p>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-xs font-semibold text-foreground">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-input border-border text-foreground text-xs focus:border-[#A66A7A] h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email" className="text-xs font-semibold text-foreground">Email Address</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-input border-border text-foreground text-xs focus:border-[#A66A7A] h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-department" className="text-xs font-semibold text-foreground">Department</Label>
                  <select
                    id="edit-department"
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full h-10 rounded-xl border border-border bg-input px-3 py-2 text-xs focus:border-[#A66A7A] focus:outline-none text-foreground"
                    required
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-role" className="text-xs font-semibold text-foreground">Access Role</Label>
                  <select
                    id="edit-role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-10 rounded-xl border border-border bg-input px-3 py-2 text-xs focus:border-[#A66A7A] focus:outline-none text-foreground"
                    required
                  >
                    <option value="DEVELOPER">Developer</option>
                    <option value="FINANCE">Finance</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleUpdateUser} className="flex-1 bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white text-xs h-10 rounded-xl">
                    Update Employee
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1 text-xs h-10 border-border rounded-xl">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Temporary Password Display */}
        {showTempPassword && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <Card className="w-full max-w-md border border-border bg-card rounded-2xl shadow-2xl p-6">
              <CardHeader className="p-0 pb-4">
                <h3 className="text-base font-bold text-[#5F8F72] flex items-center gap-1.5">
                  <AlertCircle className="w-5 h-5 text-[#5F8F72]" />
                  Employee Profile Created!
                </h3>
                <p className="text-muted-foreground text-xs mt-1">Copy and share these login credentials securely.</p>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="bg-[#C49A5A]/10 border border-[#C49A5A]/30 rounded-xl p-3.5 text-xs text-[#C49A5A] leading-relaxed">
                  <strong>⚠️ Critical warning:</strong> The temporary password is only displayed once. The employee will be forced to change this password during their initial login attempt.
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Temporary Password</Label>
                  <div className="p-3 bg-sidebar border border-border rounded-xl font-mono text-base text-foreground font-black tracking-wide text-center">
                    {tempPassword}
                  </div>
                </div>
                <Button onClick={() => setShowTempPassword(false)} className="w-full bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white text-xs h-10 rounded-xl">
                  Saved & Confirmed
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
