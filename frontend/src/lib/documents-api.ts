import api from './api';

export interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  departmentId?: string;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
  };
  uploadedBy: {
    id: string;
    name: string;
    employeeId: string;
  };
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  metadata?: any;
}

export const documentsApi = {
  getDocuments: (departmentId?: string) =>
    api.get<Document[]>('/documents', { params: { departmentId } }),

  getDocument: (documentId: string) => api.get<Document>(`/documents/${documentId}`),

  getDownloadUrl: (documentId: string) => api.get<{ url: string; fileName: string }>(`/documents/${documentId}/download`),

  getDocumentChunks: (documentId: string) => api.get<DocumentChunk[]>(`/documents/${documentId}/chunks`),

  createDocument: (data: FormData) => api.post<Document>('/documents', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  updateDocument: (documentId: string, data: {
    title?: string;
    description?: string;
    departmentId?: string;
  }) => api.put<Document>(`/documents/${documentId}`, data),

  deleteDocument: (documentId: string) => api.delete(`/documents/${documentId}`),
};
