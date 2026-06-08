import { useQuery } from '@tanstack/react-query';
import {
  getPoolStats, getLpPosition, getApyBreakdown,
  getPoolUtilisation, getLpTransactions, getYieldChart7d,
} from '@/lib/data/lend';

const STALE = { fast: 20_000, slow: 60_000 };

export const usePoolStats       = () => useQuery({ queryKey: ['lend', 'pool-stats'],   queryFn: getPoolStats,          staleTime: STALE.fast, refetchInterval: STALE.fast });
export const useLpPosition      = (wallet: string) => useQuery({ queryKey: ['lend', 'lp-position', wallet],   queryFn: () => getLpPosition(wallet),   staleTime: STALE.fast, enabled: !!wallet });
export const useApyBreakdown    = () => useQuery({ queryKey: ['lend', 'apy-breakdown'], queryFn: getApyBreakdown,       staleTime: STALE.slow });
export const usePoolUtilisation = () => useQuery({ queryKey: ['lend', 'utilisation'],  queryFn: getPoolUtilisation,    staleTime: STALE.fast, refetchInterval: STALE.fast });
export const useLpTransactions  = (wallet: string) => useQuery({ queryKey: ['lend', 'txns', wallet], queryFn: () => getLpTransactions(wallet), staleTime: STALE.slow, enabled: !!wallet });
export const useYieldChart7d    = () => useQuery({ queryKey: ['lend', 'yield-chart'],  queryFn: getYieldChart7d,       staleTime: STALE.slow });
