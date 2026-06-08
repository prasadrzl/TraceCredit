import { useQuery } from '@tanstack/react-query';
import { vaultApi } from '@/lib/api/vault';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';

export function useVaultStats() {
  return useQuery({
    queryKey: QUERY_KEYS.vaultStats(),
    queryFn: vaultApi.getStats,
    staleTime: REFETCH_INTERVALS.pool,
    refetchInterval: REFETCH_INTERVALS.pool,
  });
}

export function useSharesValue(wallet: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.sharesValue(wallet ?? ''),
    queryFn: () => vaultApi.getSharesValue(wallet!),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.pool,
  });
}
