import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';

export function useProtocolStats() {
  return useQuery({
    queryKey: QUERY_KEYS.protocolStats(),
    queryFn: analyticsApi.getProtocolStats,
    staleTime: REFETCH_INTERVALS.analytics,
    refetchInterval: REFETCH_INTERVALS.analytics,
  });
}

export function useVolumeData(days = 7) {
  return useQuery({
    queryKey: QUERY_KEYS.volume(days),
    queryFn: () => analyticsApi.getVolume(days),
    staleTime: REFETCH_INTERVALS.analytics,
  });
}
