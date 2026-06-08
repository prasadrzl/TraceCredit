import { useQuery } from '@tanstack/react-query';
import { poolApi } from '@/lib/api/pool';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';

export function usePoolOverview() {
  return useQuery({
    queryKey: QUERY_KEYS.poolOverview(),
    queryFn: poolApi.getOverview,
    staleTime: REFETCH_INTERVALS.pool,
    refetchInterval: REFETCH_INTERVALS.pool,
  });
}

export function useRecentBorrows(first = 20) {
  return useQuery({
    queryKey: QUERY_KEYS.recentBorrows(first),
    queryFn: () => poolApi.getRecentBorrows(first),
    staleTime: REFETCH_INTERVALS.pool,
    refetchInterval: REFETCH_INTERVALS.pool,
  });
}

export function useRecentPoolLiquidations(first = 20) {
  return useQuery({
    queryKey: QUERY_KEYS.recentLiquidations(first),
    queryFn: () => poolApi.getRecentLiquidations(first),
    staleTime: REFETCH_INTERVALS.pool,
  });
}
