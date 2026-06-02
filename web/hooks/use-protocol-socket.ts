import { useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';

type ProtocolEvent = 'score:updated' | 'loan:created' | 'loan:repaid' | 'loan:liquidated' | 'circuit:breaker';

export function useProtocolEvent<T = unknown>(event: ProtocolEvent, handler: (data: T) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
