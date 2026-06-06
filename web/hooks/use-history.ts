import { useQuery } from '@tanstack/react-query';
import { getHistorySummary, getHistoryLoans } from '@/lib/data/history';
import { REFETCH_INTERVALS } from '@/lib/constants';

export const useHistorySummary = (wallet: string) => useQuery({
  queryKey: ['history', 'summary', wallet],
  queryFn: () => getHistorySummary(wallet),
  staleTime: REFETCH_INTERVALS.history,
  enabled: !!wallet,
});

export const useHistoryLoans = (wallet: string) => useQuery({
  queryKey: ['history', 'loans', wallet],
  queryFn: () => getHistoryLoans(wallet),
  staleTime: REFETCH_INTERVALS.history,
  enabled: !!wallet,
});
