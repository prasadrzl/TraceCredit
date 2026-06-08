import { useQuery } from '@tanstack/react-query';
import { yieldApi } from '@/lib/api/yield';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';

export function useApyStats() {
  return useQuery({
    queryKey: QUERY_KEYS.apyStats(),
    queryFn: yieldApi.getApyStats,
    staleTime: REFETCH_INTERVALS.pool,
    refetchInterval: REFETCH_INTERVALS.pool,
  });
}

export function usePendingYield(wallet: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.pendingYield(wallet ?? ''),
    queryFn: () => yieldApi.getPendingYield(wallet!),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.pool,
  });
}
