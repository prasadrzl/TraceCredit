import { useQuery } from '@tanstack/react-query';
import { positionsApi } from '@/lib/api/positions';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';

export function useBorrowerPositions(wallet: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.positions(wallet ?? ''),
    queryFn: () => positionsApi.getBorrowerPositions(wallet!),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.history,
    refetchInterval: REFETCH_INTERVALS.history,
  });
}

export function useLoanDetail(loanId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.loan(loanId ?? ''),
    queryFn: () => positionsApi.getLoanDetail(loanId!),
    enabled: !!loanId,
    staleTime: REFETCH_INTERVALS.history,
  });
}
