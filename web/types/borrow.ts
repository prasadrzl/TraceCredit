import type { Tier } from './api';

export type LoanState = 'Active' | 'GracePeriod' | 'Repaid' | 'Defaulted' | 'WrittenOff';
export type SignalType = 'repayment' | 'dao' | 'cross' | 'late' | 'wallet' | 'holdings' | 'stake' | 'decay';

export interface BorrowerProfile {
  wallet: string;
  score: number;
  tier: Tier;
  creditLimit: string;
  creditUsed: string;
  creditAvailable: string;
  interestRateBps: number;
  rateLimit24h: string;
  rateLimitUsed: string;
  rateLimitResetSec: number;
  nextTierScore: number;
  nextTier: Tier;
  nextTierCreditLimit: string;
  nextTierRateBps: number;
  scoreToNextTier: number;
}

export interface ActiveLoan {
  loanId: string;
  state: LoanState;
  openedDate: string;
  network: string;
  principal: string;
  interest: string;
  aprBps: number;
  repaid: string;
  totalDue: string;
  deadline: string;
  daysLeft: number;
  gracePeriodDays: number;
  tier?: Tier;
  graceExpires?: string;
  scoreHitOnDefault?: number;
  freezeMonthsOnDefault?: number;
}

export interface ScoreSignal {
  id: string;
  type: SignalType;
  label: string;
  sub: string;
  daysAgo: number;
  points: number;
}
