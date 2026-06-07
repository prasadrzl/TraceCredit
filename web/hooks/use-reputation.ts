import { useQuery } from '@tanstack/react-query';
import {
  getSbtInfo, getReputationScore, getCreditSnapshot,
  getScoreHistory, getScoreStats, getRecentEvents,
  getSignalBreakdown, getNetScore, getAttestationSources, getSignalDecay,
} from '@/lib/data/reputation';

const STALE = { fast: 20_000, slow: 60_000 };

export const useSbtInfo            = (wallet: string) => useQuery({ queryKey: ['rep', 'sbt',         wallet], queryFn: () => getSbtInfo(wallet),            staleTime: STALE.slow, enabled: !!wallet });
export const useRepScore           = (wallet: string) => useQuery({ queryKey: ['rep', 'score',       wallet], queryFn: () => getReputationScore(wallet),    staleTime: STALE.fast, refetchInterval: STALE.fast, enabled: !!wallet });
export const useRepCreditSnapshot  = (wallet: string) => useQuery({ queryKey: ['rep', 'credit',      wallet], queryFn: () => getCreditSnapshot(wallet),     staleTime: STALE.fast, enabled: !!wallet });
export const useScoreHistory       = (wallet: string) => useQuery({ queryKey: ['rep', 'history',     wallet], queryFn: () => getScoreHistory(wallet),       staleTime: STALE.slow, enabled: !!wallet });
export const useScoreStats         = (wallet: string) => useQuery({ queryKey: ['rep', 'stats',       wallet], queryFn: () => getScoreStats(wallet),         staleTime: STALE.slow, enabled: !!wallet });
export const useRecentEvents       = (wallet: string) => useQuery({ queryKey: ['rep', 'events',      wallet], queryFn: () => getRecentEvents(wallet),       staleTime: STALE.fast, refetchInterval: STALE.fast, enabled: !!wallet });
export const useSignalBreakdown    = (wallet: string) => useQuery({ queryKey: ['rep', 'breakdown',   wallet], queryFn: () => getSignalBreakdown(wallet),    staleTime: STALE.slow, enabled: !!wallet });
export const useNetScore           = (wallet: string) => useQuery({ queryKey: ['rep', 'net-score',   wallet], queryFn: () => getNetScore(wallet),           staleTime: STALE.slow, enabled: !!wallet });
export const useAttestationSources = (wallet: string) => useQuery({ queryKey: ['rep', 'attestation', wallet], queryFn: () => getAttestationSources(wallet), staleTime: STALE.slow, enabled: !!wallet });
export const useSignalDecay        = (wallet: string) => useQuery({ queryKey: ['rep', 'decay',       wallet], queryFn: () => getSignalDecay(wallet),        staleTime: STALE.slow, enabled: !!wallet });
