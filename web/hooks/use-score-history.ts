import { useQuery } from '@tanstack/react-query';
import { getScoreHeader, getScoreTrend, getSignalBreakdown, getScoreEvents } from '@/lib/data/score-history';
import { REFETCH_INTERVALS } from '@/lib/constants';

export const useScoreHeader = (wallet: string) => useQuery({
  queryKey: ['score-history', 'header', wallet],
  queryFn: () => getScoreHeader(wallet),
  staleTime: REFETCH_INTERVALS.history,
  enabled: !!wallet,
});

export const useScoreTrend = (wallet: string) => useQuery({
  queryKey: ['score-history', 'trend', wallet],
  queryFn: () => getScoreTrend(wallet),
  staleTime: REFETCH_INTERVALS.history,
  enabled: !!wallet,
});

export const useSignalBreakdown = (wallet: string) => useQuery({
  queryKey: ['score-history', 'breakdown', wallet],
  queryFn: () => getSignalBreakdown(wallet),
  staleTime: REFETCH_INTERVALS.score,
  enabled: !!wallet,
});

export const useScoreEvents = (wallet: string) => useQuery({
  queryKey: ['score-history', 'events', wallet],
  queryFn: () => getScoreEvents(wallet),
  staleTime: REFETCH_INTERVALS.history,
  enabled: !!wallet,
});
