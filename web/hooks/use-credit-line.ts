import { useQuery } from '@tanstack/react-query';
import { creditApi } from '@/lib/api/credit';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';

export function useCreditLine(wallet: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.creditLine(wallet ?? ''),
    queryFn: () => creditApi.getCreditLine(wallet!),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.score,
  });
}

export function useRateLimitStatus(wallet: string | undefined, tier = 0) {
  return useQuery({
    queryKey: QUERY_KEYS.rateLimit(wallet ?? '', tier),
    queryFn: () => creditApi.getRateLimitStatus(wallet!, tier),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.price,
    refetchInterval: REFETCH_INTERVALS.price,
  });
}
