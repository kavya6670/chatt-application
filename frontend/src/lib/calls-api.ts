import api from './api';

export type CallType = 'AUDIO' | 'VIDEO';

export interface Call {
  id: string;
  type: CallType;
  status: string;
  initiatorId: string;
  conversationId?: string;
  liveKitRoomName?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
  participants: {
    id: string;
    userId: string;
    joinedAt?: string;
    leftAt?: string;
    user: {
      id: string;
      name: string;
      employeeId: string;
    };
  }[];
}

export interface JoinCallResponse {
  call: Call;
  signalingServer: string;
}

export const callsApi = {
  createCall: (data: {
    type: CallType;
    conversationId?: string;
    participantIds: string[];
  }) => api.post<Call>('/calls', data),

  joinCall: (data: { callId: string }) => api.post<JoinCallResponse>('/calls/join', data),

  leaveCall: (callId: string) => api.post(`/calls/${callId}/leave`),

  endCall: (callId: string) => api.post(`/calls/${callId}/end`),

  getCallHistory: (limit = 20) => api.get<Call[]>('/calls/history', { params: { limit } }),

  getCall: (callId: string) => api.get<Call>(`/calls/${callId}`),
};
