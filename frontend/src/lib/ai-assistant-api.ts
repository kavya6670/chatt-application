import api from './api';

export interface AIConversation {
  id: string;
  userId: string;
  departmentId: string;
  query: string;
  response: string;
  sources: string[];
  createdAt: string;
}

export interface ChatResponse {
  response: string;
  sources: any[];
  conversationId: string;
}

export const aiAssistantApi = {
  chat: (data: { query: string; conversationId?: string }) =>
    api.post<ChatResponse>('/ai-assistant/chat', data),

  getConversations: (limit = 20) =>
    api.get<AIConversation[]>('/ai-assistant/conversations', { params: { limit } }),

  getConversation: (conversationId: string) =>
    api.get<AIConversation>(`/ai-assistant/conversations/${conversationId}`),
};
