import { useQuery } from '@tanstack/react-query';
import { configApi } from '@/lib/api/config';
import type { PoolConfig } from '@/types/api';

export const PROTOCOL_CONFIG_DEFAULTS: PoolConfig = {
  kinkBps: 7000,
  capBps: 9000,
  reserveFactorBps: 1500,
  maxUtilisationBps: 9000,
  tiers: {
    Bronze:   { creditLimitUsdc: 0,     interestRateBps: 1800, minScore: 0   },
    Silver:   { creditLimitUsdc: 500,   interestRateBps: 1800, minScore: 200 },
    Gold:     { creditLimitUsdc: 5000,  interestRateBps: 1400, minScore: 400 },
    Platinum: { creditLimitUsdc: 25000, interestRateBps: 1000, minScore: 600 },
    Diamond:  { creditLimitUsdc: 100000,interestRateBps: 700,  minScore: 800 },
  },
  maxScore: 1000,
  diamondScore: 800,
  gracePeriodDays: 7,
  onTimeRepaymentScoreGain: 22,
  gracePeriodScoreHit: 50,
  sbtStakeUsdc: 50,
  sbtUnlockDays: 30,
  signalDecayDays: 90,
  signalExpiryWarningDays: 14,
  limitIncreaseDays: 30,
};

export function useProtocolConfig() {
  return useQuery({
    queryKey: ['protocol', 'config'],
    queryFn: configApi.getProtocolConfig,
    staleTime: 300_000,
    placeholderData: PROTOCOL_CONFIG_DEFAULTS,
  });
}
