import { useQuery } from '@tanstack/react-query';
import {
  getBorrowerProfile, getActiveLoans, getScoreSignals,
} from '@/lib/data/borrow';

const STALE = { fast: 20_000, slow: 60_000 };

export const useBorrowerProfile = (wallet: string) =>
  useQuery({ queryKey: ['borrow', 'profile', wallet], queryFn: () => getBorrowerProfile(wallet), staleTime: STALE.fast, refetchInterval: STALE.fast, enabled: !!wallet });

export const useActiveLoans = (wallet: string) =>
  useQuery({ queryKey: ['borrow', 'loans', wallet], queryFn: () => getActiveLoans(wallet), staleTime: STALE.fast, refetchInterval: STALE.fast, enabled: !!wallet });

export const useScoreSignals = (wallet: string) =>
  useQuery({ queryKey: ['borrow', 'signals', wallet], queryFn: () => getScoreSignals(wallet), staleTime: STALE.slow, enabled: !!wallet });
