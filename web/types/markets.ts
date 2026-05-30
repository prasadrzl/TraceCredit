import type { Tier } from './api';

export type LoanState = 'Active' | 'GracePeriod' | 'Repaid' | 'Defaulted' | 'WrittenOff';

export interface MarketStats {
  borrowVol24h: string;
  repayVol24h: string;
  utilisationBps: number;
  liquidations24h: number;
  liquidationsWrittenOff24h: string;
  totalBorrowers: number;
  activeBorrowers: number;
  repaidBorrowers: number;
  borrowVolDeltaBps: number;
  repayVolDeltaBps: number;
}

export interface MarketBorrowEntry {
  loanId: string;
  borrower: string;
  tier: Tier;
  principal: string;
  aprBps: number;
  state: LoanState;
  deadline: string;
}

export interface PoolDepthPoint {
  utilPct: number;
  belowKink: number | null;
  aboveKink: number | null;
}

export interface PoolDepthStats {
  currentUtilBps: number;
  belowKinkAprBps: number;
  aboveKinkMinBps: number;
  aboveKinkMaxBps: number;
  lpNetApyBps: number;
  kinkBps: number;
  capBps: number;
  reserveFactorBps: number;
}

export interface ScoreBucket {
  bucket: number;
  count: number;
}

export interface TierDistribution {
  Diamond: number;
  Platinum: number;
  Gold: number;
  Silver: number;
  Bronze: number;
}

export interface ScoreDistributionMeta {
  totalWallets: number;
  activeWallets: number;
}

export interface MarketLiquidationEntry {
  loanId: string;
  tier: Tier;
  borrower: string;
  recovered: string;
  writtenOff: string;
  daysAgo: number;
}

export interface MarketLiquidationStats {
  total: number;
  totalRecovered: string;
  totalWrittenOff: string;
  recoveryRateBps: number;
}
