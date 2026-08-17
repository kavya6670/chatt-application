import api from './api';

export interface Department {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count?: {
    users: number;
  };
}

export const departmentsApi = {
  getAllDepartments: () => api.get<Department[]>('/departments'),

  getDepartmentById: (id: string) => api.get<Department>(`/departments/${id}`),

  createDepartment: (data: {
    name: string;
    slug: string;
    description?: string;
  }) => api.post<Department>('/departments', data),

  updateDepartment: (id: string, data: {
    name?: string;
    slug?: string;
    description?: string;
  }) => api.put<Department>(`/departments/${id}`, data),

  deleteDepartment: (id: string) => api.delete(`/departments/${id}`),
};
