import api from './api';
import { User } from './auth-api';

export const usersApi = {
  getCurrentUser: () => api.get<User>('/users/me'),

  getAllUsers: (params?: {
    departmentId?: string;
    role?: string;
    isActive?: boolean;
    search?: string;
  }) => api.get<User[]>('/users', { params }),

  getUserById: (id: string) => api.get<User>(`/users/${id}`),

  createUser: (data: {
    employeeId: string;
    email: string;
    name: string;
    password: string;
    role: string;
    departmentId: string;
  }) => api.post<User>('/users', data),

  updateUser: (id: string, data: {
    email?: string;
    name?: string;
    role?: string;
    departmentId?: string;
    isActive?: boolean;
  }) => api.put<User>(`/users/${id}`, data),

  resetPassword: (id: string, password?: string) =>
    api.post<{ message: string; temporaryPassword: string }>(`/users/${id}/reset-password`, { password }),

  deleteUser: (id: string) => api.delete(`/users/${id}`),

  deactivateUser: (id: string) => api.post(`/users/${id}/deactivate`),

  activateUser: (id: string) => api.post(`/users/${id}/activate`),
};
