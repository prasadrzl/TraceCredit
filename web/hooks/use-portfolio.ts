import { useQuery } from '@tanstack/react-query';
import {
  getNetPosition, getPositionStats, getBorrowPositions,
  getReputationSnapshot, getRecentActivity, getNetPositionChart,
} from '@/lib/data/portfolio';

const STALE = { fast: 20_000, slow: 60_000 };

export const useNetPosition       = (wallet: string) => useQuery({ queryKey: ['portfolio', 'net',        wallet], queryFn: () => getNetPosition(wallet),       staleTime: STALE.fast, refetchInterval: STALE.fast, enabled: !!wallet });
export const usePositionStats     = (wallet: string) => useQuery({ queryKey: ['portfolio', 'stats',      wallet], queryFn: () => getPositionStats(wallet),     staleTime: STALE.fast, refetchInterval: STALE.fast, enabled: !!wallet });
export const useBorrowPositions   = (wallet: string) => useQuery({ queryKey: ['portfolio', 'borrows',    wallet], queryFn: () => getBorrowPositions(wallet),   staleTime: STALE.fast, refetchInterval: STALE.fast, enabled: !!wallet });
export const useReputationSnap    = (wallet: string) => useQuery({ queryKey: ['portfolio', 'rep-snap',   wallet], queryFn: () => getReputationSnapshot(wallet), staleTime: STALE.slow, enabled: !!wallet });
export const useRecentActivity    = (wallet: string) => useQuery({ queryKey: ['portfolio', 'activity',   wallet], queryFn: () => getRecentActivity(wallet),    staleTime: STALE.fast, enabled: !!wallet });
export const useNetPositionChart  = (wallet: string) => useQuery({ queryKey: ['portfolio', 'chart',      wallet], queryFn: () => getNetPositionChart(wallet),  staleTime: STALE.slow, enabled: !!wallet });
