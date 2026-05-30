import type { Tier } from './api';

export interface NetPosition {
  netValue: string;
  yieldEarned: string;
  lpValue: string;
  outstandingDebt: string;
}

export interface PositionStats {
  repScore: number;
  repTier: Tier;
  creditUsedBps: number;
  creditLimit: string;
  creditUsed: string;
  health: string;
  healthSub: string;
  urgentLoans: number;
  urgentSub: string;
  nextLimitDays: number;
  nextLimitSub: string;
  lpShares: string;
  lpApyBps: number;
  pendingYield: string;
  sbtStakeLocked: string;
  sbtUnlockDelay: string;
}

export interface BorrowAlert {
  loanId: string;
  message: string;
  repayAmount: string;
}

export type BorrowLoanState = 'Active' | 'GracePeriod' | 'Repaid' | 'Defaulted';

export interface ActiveBorrowPosition {
  loanId: string;
  state: BorrowLoanState;
  openedDate: string;
  deadline: string;
  daysLeft: number;
  tier: Tier;
  repaidBps: number;
  principal: string;
  interest: string;
  note: string;
}

export interface HistoricalBorrowPosition {
  loanId: string;
  state: BorrowLoanState;
  dateRange: string;
  repaidBps: number;
  principal: string;
  note: string;
}

export interface BorrowPositions {
  openCount: number;
  historicalCount: number;
  alert?: BorrowAlert;
  active: ActiveBorrowPosition[];
  historical: HistoricalBorrowPosition[];
}

export interface RepSignal {
  label: string;
  points: number;
  color: string;
}

export interface ReputationSnapshot {
  score: number;
  tier: Tier;
  change30d: number;
  signals: RepSignal[];
}

export type ActivityType = 'repay' | 'borrow' | 'score' | 'deposit' | 'penalty' | 'withdraw';

export interface RecentActivity {
  id: string;
  type: ActivityType;
  label: string;
  sub: string;
  amount?: string;
  scoreChange?: number;
  daysAgo: number;
}

export interface NetPositionChartPoint {
  label: string;
  lp: number;
  debt: number;
  net: number;
}
