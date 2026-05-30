import type { Tier } from './api';

export interface LiquidationSummary {
  totalLiquidations: number;
  allTimePctOfLoans: number;
  totalRecovered: string;
  recoveredPctOfPrincipal: number;
  totalWrittenOff: string;
  recoveryRate: number;
  recoveryRateChange: number;
}

export interface LiquidationRecord {
  loanNum: number;
  loanTxHash: string;
  borrowerShort: string;
  borrowerScore: number;
  tier: Tier;
  principal: string;
  recovered: string;
  writtenOff?: string;
  recoveryPct: number;
  keeperTxHash: string;
  keeperDate: string;
}

export interface RecoveryBreakdown {
  recovered: number;
  writtenOff: number;
  total: number;
}

export interface ReserveFund {
  balance: number;
  healthPct: number;
  badDebtAbsorbed: number;
  netInflows30d: number;
  coverageRatio: number;
  targetFloor: number;
}

export interface KeeperBot {
  status: 'online' | 'offline';
  lastActiveMinsAgo: number;
  nextScanSecs: number;
  address: string;
  batchSize: number;
  scanIntervalMins: number;
  txSuccessRatePct: number;
  gasSpent30dEth: number;
}

export interface LiqActivity {
  timeUtc: string;
  minsAgo: number;
  loanNum: number;
  borrowerShort: string;
  recovered: string;
  writtenOff: string;
  txHash: string;
  note: string;
  nextScanSecs: number;
}
