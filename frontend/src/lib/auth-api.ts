import api from './api';

export interface LoginResponse {
  access_token: string;
  mustResetPassword: boolean;
  user: {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    role: string;
    departmentId: string;
  };
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  departmentId: string;
  isActive?: boolean;
  mustResetPassword?: boolean;
  createdAt?: string;
  department?: {
    id: string;
    name: string;
    slug: string;
  };
}

export const authApi = {
  login: (employeeId: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { employeeId, password }),

  resetPassword: (newPassword: string) =>
    api.post('/auth/reset-password', { newPassword }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  getCurrentUser: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),
};
