export interface LoanDetail {
  loanNum: number;
  state: 'Active' | 'GracePeriod' | 'Repaid' | 'Defaulted';
  borrower: string;
  openedIso: string;
  openedDisplay: string;
  network: string;
  deadline: string;
  daysLeft: number;
  principal: string;
  outstanding: string;
  interestRateBps: number;
  gracePeriodDays: number;
  creditLimit: string;
  creditUsed: string;
  creditPct: number;
  openTxHash: string;
  basescanUrl: string;
  requestedAt: string;
  activeAt: string;
  activeDate: string;
}

export interface InterestAccrual {
  principal: string;
  accruedInterest: string;
  dailyRate: string;
  aprBps: number;
  blocksElapsed: number;
  projectedAtDeadline: string;
  projectedDisplay: string;
}

export interface LoanRepayment {
  date: string;
  amount: string;
  txHash: string;
  type: 'partial' | 'full';
}

export interface ScoreImpactDetail {
  projectedPoints: number;
  repaymentNumber: number;
  currentScore: number;
  currentTier: string;
  currentTierScore: number;
  nextTier: string;
  nextTierScore: number;
  ptsToNextTier: number;
}
