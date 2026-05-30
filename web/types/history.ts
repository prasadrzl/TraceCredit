import type { Tier } from './api';

export type HistoryLoanState = 'Active' | 'GracePeriod' | 'Repaid' | 'Defaulted';

export interface HistorySummary {
  totalLoans: number;
  totalBorrowed: string;
  totalRepaid: string;
  repaidPct: number;
  defaults: number;
  defaultRate: number;
}

export interface HistoryLoan {
  loanNum: number;
  txHash: string;
  openedDate: string;
  openedIso: string;
  principal: string;
  interestPaid: string;
  interestPct: number;
  aprBps: number;
  state: HistoryLoanState;
  deadline: string;
  daysLeft?: number;
  gracePeriodLeft?: string;
  graceDeadline?: string;
  closedNote?: string;
}
