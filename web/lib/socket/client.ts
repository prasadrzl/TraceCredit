import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function createProtocolSocket(): Socket {
  if (socket?.connected) return socket;

  const base = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';
  socket = io(`${base}/protocol`, {
    transports: ['websocket'],
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return socket;
}

export function getProtocolSocket(): Socket | null {
  return socket;
}
