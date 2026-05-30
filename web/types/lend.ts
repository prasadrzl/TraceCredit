export interface PoolStats {
  tvl: string;
  sharesOutstanding: string;
  netLpApyBps: number;
  utilisationBps: number;
  kinkBps: number;
  capBps: number;
  sharePrice: string;
  sharePriceDeltaBps: number;
}

export interface LpPosition {
  shares: string;
  usdcValue: string;
  poolShareBps: number;
  netApyBps: number;
  dailyYield: string;
  annualYield: string;
  pendingYield: string;
  totalDeposited: string;
  redemptionValue: string;
}

export interface ApyBreakdown {
  grossApyBps: number;
  reserveCutBps: number;
  netLpApyBps: number;
}

export interface PoolUtilisation {
  currentUtilBps: number;
  currentBorrowAprBps: number;
  kinkBps: number;
  capBps: number;
  grossPoolApyBps: number;
  reserveFactorBps: number;
  reserveBalance: string;
  atKinkWarningBps: number;
}

export type TxType = 'deposit' | 'withdrawal';

export interface LpTransaction {
  id: string;
  type: TxType;
  wallet: string;
  amount: string;
  date: string;
}

export interface YieldDataPoint {
  date: string;
  dailyYield: string;
  borrowVolume: string;
}
