import { useQuery } from '@tanstack/react-query';
import { liquidationApi } from '@/lib/api/liquidation';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';

export function useRecentLiquidations(limit = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.liquidations(limit),
    queryFn: () => liquidationApi.getRecent(limit),
    staleTime: REFETCH_INTERVALS.liquidations,
    refetchInterval: REFETCH_INTERVALS.liquidations,
  });
}

export function useLiquidationStats() {
  return useQuery({
    queryKey: QUERY_KEYS.liquidationStats(),
    queryFn: liquidationApi.getStats,
    staleTime: REFETCH_INTERVALS.liquidations,
    refetchInterval: REFETCH_INTERVALS.liquidations,
  });
}

export function useLiquidationsByBorrower(wallet: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.liquidationsByBorrower(wallet ?? ''),
    queryFn: () => liquidationApi.getByBorrower(wallet!),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.liquidations,
  });
}
