import api from './api';
export type ConversationType = 'DIRECT' | 'GROUP';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    employeeId: string;
  };
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  updatedAt: string;
  unreadCount: number;
  participants: {
    id: string;
    userId: string;
    isAdmin: boolean;
    user: {
      id: string;
      name: string;
      employeeId: string;
      email: string;
    };
  }[];
  messages?: Message[];
}

export const chatApi = {
  getConversations: () => api.get<Conversation[]>('/chat/conversations'),

  getConversation: (id: string) => api.get<Conversation>(`/chat/conversations/${id}`),

  getMessages: (conversationId: string, limit = 50, offset = 0) =>
    api.get<Message[]>(`/chat/conversations/${conversationId}/messages`, {
      params: { limit, offset },
    }),

  createConversation: (data: {
    type: ConversationType;
    name?: string;
    participantIds: string[];
    departmentId?: string;
  }) => api.post<Conversation>('/chat/conversations', data),

  sendMessage: (data: {
    conversationId: string;
    content: string;
    attachments?: string[];
  }) => api.post<Message>('/chat/messages', data),

  markAsRead: (conversationId: string) =>
    api.put(`/chat/conversations/${conversationId}/read`),

  addParticipant: (conversationId: string, userId: string) =>
    api.post(`/chat/conversations/${conversationId}/participants`, { userId }),

  removeParticipant: (conversationId: string, userId: string) =>
    api.delete(`/chat/conversations/${conversationId}/participants/${userId}`),
};
