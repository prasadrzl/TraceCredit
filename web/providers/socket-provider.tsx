'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { type Socket } from 'socket.io-client';
import { createProtocolSocket } from '@/lib/socket/client';
import { useActivityStore } from '@/store/activity-store';

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const addActivity = useActivityStore((s) => s.addActivity);

  useEffect(() => {
    const socket = createProtocolSocket();
    socketRef.current = socket;

    socket.on('score:updated', (data) => addActivity({ type: 'score', ...data, ts: Date.now() }));
    socket.on('loan:created', (data) => addActivity({ type: 'borrow', ...data, ts: Date.now() }));
    socket.on('loan:repaid', (data) => addActivity({ type: 'repaid', ...data, ts: Date.now() }));
    socket.on('loan:liquidated', (data) => addActivity({ type: 'liquidation', ...data, ts: Date.now() }));

    return () => {
      socket.disconnect();
    };
  }, [addActivity]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
