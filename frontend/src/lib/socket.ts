import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';

let socket: Socket | null = null;

export const getSocket = () => {
  if (socket) return socket;

  const token = useAuthStore.getState().token;
  if (!token) return null;

  socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
    auth: { token },
    transports: ['websocket'],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
