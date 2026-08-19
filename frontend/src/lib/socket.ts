import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { getApiUrl } from './api';

let socket: Socket | null = null;

export const getSocket = () => {
  if (socket && socket.connected) return socket;

  const token = useAuthStore.getState().token;
  if (!token) return null;

  const apiUrl = getApiUrl();
  socket = io(apiUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
