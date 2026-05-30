import type { Tier } from './api';

export type SignalType = 'repayment' | 'dao' | 'cross' | 'late' | 'wallet' | 'holdings' | 'stake' | 'decay';
export type AttestationStatus = 'Active' | 'ExpiringSoon' | 'NotAttested';

export interface SbtInfo {
  wallet: string;
  tokenId: number;
  mintedDate: string;
  stakeLocked: string;
  status: string;
  frozen: boolean;
}

export interface ReputationScore {
  score: number;
  tier: Tier;
  nextTier: Tier;
  nextTierScore: number;
  diamondScore: number;
  ptsToNextTier: number;
  ptsToDiamond: number;
  unlocksAtDiamond: string;
  rateAtDiamond: number;
  limitLockupDays: number;
}

export interface SbtProtection {
  guardianSet: string;
  stakeVault: string;
  unlockDelay: string;
}

export interface CreditSnapshot {
  tier: Tier;
  creditLimit: string;
  creditUsed: string;
  creditAvailable: string;
  interestRateBps: number;
  limitIncreaseDays: number;
  activeLoans: number;
  loansRepaid: number;
  defaults: number;
  lastActivityDaysAgo: number;
  sbtProtection: SbtProtection;
}

export interface ScoreHistoryPoint {
  label: string;
  score: number;
}

export interface ScoreStats {
  change30d: number;
  peakScore: number;
  signalCount: number;
}

export interface RecentEvent {
  id: string;
  type: SignalType;
  label: string;
  sub: string;
  score: number;
  points: number;
  daysAgo: number;
}

export interface SignalBreakdownItem {
  id: string;
  type: SignalType;
  label: string;
  count?: number;
  meta?: string | null;
  points: number;
}

export interface NetScore {
  base: number;
  tierBonus: number;
  displayed: number;
  netPoints: number;
}

export interface AttestationSource {
  id: string;
  name: string;
  sub: string;
  status: AttestationStatus;
  attested: string | null;
  quorum: number | null;
  dots?: number;
}

export interface SignalDecayItem {
  id: string;
  signal: string;
  applied: string;
  expires: string;
  duration: string;
  points: number;
  expiring: boolean;
}
