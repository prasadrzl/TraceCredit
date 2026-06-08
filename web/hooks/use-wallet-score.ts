import { useQuery } from '@tanstack/react-query';
import { scoreApi } from '@/lib/api/score';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';

export function useWalletScore(wallet: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.score(wallet ?? ''),
    queryFn: () => scoreApi.getWalletScore(wallet!),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.score,
    refetchInterval: REFETCH_INTERVALS.score,
  });
}

export function useScoreHistory(wallet: string | undefined, limit = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.scoreHistory(wallet ?? '', limit),
    queryFn: () => scoreApi.getScoreHistory(wallet!, limit),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.score,
  });
}
