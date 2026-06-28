'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { type Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { createProtocolSocket } from '@/lib/socket/client';
import { useActivityStore } from '@/store/activity-store';
import { useToast } from '@/hooks/use-toast';

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const addActivity = useActivityStore((s) => s.addActivity);
  const { address } = useAccount();
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    const socket = createProtocolSocket();
    socketRef.current = socket;

    // ── Global activity feed events ─────────────────────────────────────
    socket.on('loan:created', (data: any) => {
      addActivity({ type: 'borrow', ...data, ts: Date.now() });
    });

    socket.on('loan:repaid', (data: any) => {
      addActivity({ type: 'repaid', ...data, ts: Date.now() });
    });

    socket.on('loan:liquidated', (data: any) => {
      addActivity({ type: 'liquidation', ...data, ts: Date.now() });
    });

    socket.on('score:updated', (data: any) => {
      addActivity({ type: 'score', ...data, ts: Date.now() });
    });

    // ── Per-wallet toast notifications & cache invalidation ─────────────
    socket.on('loan:created', (data: any) => {
      if (!address || data.borrower?.toLowerCase() !== address.toLowerCase()) return;
      toast({
        title: 'Loan funded',
        description: `Loan #${data.loanId} · $${(Number(data.principal) / 1e6).toLocaleString()} USDC drawn`,
      });
      qc.invalidateQueries({ queryKey: ['borrow'] });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    });

    socket.on('loan:repaid', (data: any) => {
      if (!address || data.borrower?.toLowerCase() !== address.toLowerCase()) return;
      toast({
        title: 'Loan repaid',
        description: `Loan #${data.loanId} fully repaid${data.fully ? ' · Credit restored' : ''}`,
      });
      qc.invalidateQueries({ queryKey: ['borrow'] });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    });

    socket.on('loan:defaulted', (data: any) => {
      if (!address || data.borrower?.toLowerCase() !== address.toLowerCase()) return;
      toast({
        title: 'Loan defaulted',
        description: `Loan #${data.loanId} has entered default. Your score has been penalised.`,
        variant: 'destructive',
      });
      qc.invalidateQueries({ queryKey: ['borrow'] });
      qc.invalidateQueries({ queryKey: ['score'] });
    });

    socket.on('loan:liquidated', (data: any) => {
      if (!address || data.borrower?.toLowerCase() !== address.toLowerCase()) return;
      toast({
        title: 'Position liquidated',
        description: `Loan #${data.loanId} was liquidated. $${(Number(data.recoveredAmount) / 1e6).toLocaleString()} recovered.`,
        variant: 'destructive',
      });
      qc.invalidateQueries({ queryKey: ['borrow'] });
      qc.invalidateQueries({ queryKey: ['score'] });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
    });

    socket.on('score:updated', (data: any) => {
      if (!address || data.wallet?.toLowerCase() !== address.toLowerCase()) return;
      const delta = data.newScore - data.previousScore;
      const sign = delta >= 0 ? '+' : '';
      toast({
        title: 'Reputation score updated',
        description: `${data.previousScore} → ${data.newScore} (${sign}${delta} pts) · Tier: ${data.tier}`,
      });
      qc.invalidateQueries({ queryKey: ['score'] });
      qc.invalidateQueries({ queryKey: ['reputation'] });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
    });

    socket.on('circuit:breaker', (data: any) => {
      toast({
        title: `Circuit breaker — ${data.contract}`,
        description: data.details,
        variant: 'destructive',
      });
    });

    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Subscribe to wallet-specific room when address changes ────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !address) return;

    socket.emit('subscribe:wallet', { wallet: address.toLowerCase() });
    return () => {
      socket.emit('unsubscribe:wallet', { wallet: address.toLowerCase() });
    };
  }, [address]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
