import { useQuery } from '@tanstack/react-query';
import {
  getMarketStats, getMarketVolume, getRecentBorrows,
  getPoolDepthCurve, getPoolDepthStats,
  getScoreDistribution, getTierDistribution, getScoreDistributionMeta,
  getRecentLiquidations, getLiquidationStats,
} from '@/lib/data/markets';

const STALE = { stats: 30_000, slow: 60_000 };

export const useMarketStats        = () => useQuery({ queryKey: ['markets','stats'],       queryFn: getMarketStats,            staleTime: STALE.stats, refetchInterval: STALE.stats });
export const useMarketVolume       = () => useQuery({ queryKey: ['markets','volume'],      queryFn: getMarketVolume,           staleTime: STALE.slow  });
export const useRecentBorrows      = () => useQuery({ queryKey: ['markets','borrows'],     queryFn: getRecentBorrows,          staleTime: STALE.stats, refetchInterval: STALE.stats });
export const usePoolDepthCurve     = () => useQuery({ queryKey: ['markets','depth-curve'], queryFn: getPoolDepthCurve,         staleTime: STALE.slow  });
export const usePoolDepthStats     = () => useQuery({ queryKey: ['markets','depth-stats'], queryFn: getPoolDepthStats,         staleTime: STALE.stats, refetchInterval: STALE.stats });
export const useScoreDistribution  = () => useQuery({ queryKey: ['markets','score-dist'],  queryFn: getScoreDistribution,      staleTime: STALE.slow  });
export const useTierDistribution   = () => useQuery({ queryKey: ['markets','tier-dist'],   queryFn: getTierDistribution,       staleTime: STALE.slow  });
export const useScoreDistMeta      = () => useQuery({ queryKey: ['markets','score-meta'],  queryFn: getScoreDistributionMeta,  staleTime: STALE.slow  });
export const useRecentLiquidations = () => useQuery({ queryKey: ['markets','liquidations'],queryFn: getRecentLiquidations,     staleTime: STALE.stats });
export const useLiquidationStats   = () => useQuery({ queryKey: ['markets','liq-stats'],   queryFn: getLiquidationStats,       staleTime: STALE.stats });
