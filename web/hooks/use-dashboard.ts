import { useQuery } from '@tanstack/react-query';
import {
  getProtocolStats, getVaultStats, getApyStats,
  getVolumeData, getUsdcPrice,
  getAtRiskPositions, getBorrowersByTier, getProtocolHealth,
} from '@/lib/data/dashboard';
import { REFETCH_INTERVALS } from '@/lib/constants';

export const useDashboardStats   = () => useQuery({ queryKey: ['dash','stats'],   queryFn: getProtocolStats,   staleTime: REFETCH_INTERVALS.analytics, refetchInterval: REFETCH_INTERVALS.analytics });
export const useDashboardVault   = () => useQuery({ queryKey: ['dash','vault'],   queryFn: getVaultStats,      staleTime: REFETCH_INTERVALS.pool,      refetchInterval: REFETCH_INTERVALS.pool      });
export const useDashboardApy     = () => useQuery({ queryKey: ['dash','apy'],     queryFn: getApyStats,        staleTime: REFETCH_INTERVALS.pool,      refetchInterval: REFETCH_INTERVALS.pool      });
export const useDashboardPrice   = () => useQuery({ queryKey: ['dash','price'],   queryFn: getUsdcPrice,       staleTime: REFETCH_INTERVALS.price,     refetchInterval: REFETCH_INTERVALS.price     });
export const useAtRiskPositions  = () => useQuery({ queryKey: ['dash','at-risk'], queryFn: getAtRiskPositions, staleTime: REFETCH_INTERVALS.analytics  });
export const useBorrowersByTier  = () => useQuery({ queryKey: ['dash','tiers'],   queryFn: getBorrowersByTier, staleTime: REFETCH_INTERVALS.analytics  });
export const useProtocolHealth   = () => useQuery({ queryKey: ['dash','health'],  queryFn: getProtocolHealth,  staleTime: REFETCH_INTERVALS.health,    refetchInterval: REFETCH_INTERVALS.health    });

export function useVolumeChart(days: 7 | 30 | 90) {
  return useQuery({
    queryKey: ['dash', 'volume', days],
    queryFn:  () => getVolumeData(days),
    staleTime: REFETCH_INTERVALS.analytics,
  });
}
