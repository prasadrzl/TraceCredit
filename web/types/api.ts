export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
export type LoanStateLabel = 'Active' | 'GracePeriod' | 'Defaulted' | 'WrittenOff' | 'Repaid';

export interface WalletScore {
  wallet: string;
  score: number;
  tier: Tier;
  hasSbt: boolean;
  isFrozen: boolean;
  isBlacklisted: boolean;
  creditLimit: string;
  interestRateBps: string;
  lockupEnds: number;
  lastActivity: number;
}

export interface ScoreHistoryItem {
  wallet: string;
  score: number;
  previousScore: number;
  tier: Tier;
  source: string;
  txHash?: string;
  blockNumber?: string;
  recordedAt: string;
}

export interface CreditLine {
  wallet: string;
  limit: string;
  used: string;
  available: string;
  frozen: boolean;
  tier: Tier;
  interestRateBps: string;
}

export interface RateLimitStatus {
  wallet: string;
  tier: number;
  dailyLimit: string;
  windowUsed: string;
  remaining: string;
  windowResetsAt: number;
}

export interface Loan {
  loanId: string;
  borrower: string;
  principal: string;
  interestRateBps: string;
  startBlock: string;
  deadline: number;
  repaid: string;
  accruedInterest: string;
  state: number;
  stateLabel: LoanStateLabel;
}

export interface BorrowerPositions {
  wallet: string;
  activeLoans: Loan[];
  historicalLoans: Loan[];
  totalBorrowed: string;
  totalRepaid: string;
}

export interface VaultStats {
  totalAssets: string;
  totalShares: string;
  outstandingLoans: string;
  utilisationBps: number;
  sharePrice: string;
  reserveBalance: string;
  maxUtilisationBps: number;
}

export interface SharesValue {
  wallet: string;
  shares: string;
  usdcValue: string;
}

export interface ApyStats {
  utilisationBps: number;
  grossApyBps: number;
  netLpApyBps: number;
  reserveFactorBps: number;
}

export interface PendingYield {
  wallet: string;
  shares: string;
  estimatedDailyUsdc: string;
  estimatedAnnualUsdc: string;
  netApyBps: number;
}

export interface PoolOverview {
  totalDeposited: string;
  totalBorrowed: string;
  utilisationBps: number;
  activeLoanCount: number;
  totalLoanCount: number;
}

export interface BorrowEvent {
  loanId: string;
  borrower: string;
  amount: string;
  tier: Tier;
  state: LoanStateLabel;
  timestamp: number;
  txHash: string;
}

export interface ProtocolStats {
  tvl: string;
  totalBorrowVolume: string;
  totalRepayVolume: string;
  activeBorrowers: number;
  totalBorrowers: number;
  utilisationBps: number;
  averageScore: number;
}

export interface DailyVolume {
  date: string;
  borrowVolume: string;
  repayVolume: string;
}

export interface LiquidationRecord {
  loanId: string;
  borrower: string;
  recoveredAmount: string;
  writtenOffAmount: string;
  txHash: string;
  blockNumber: string;
  liquidatedAt: string;
}

export interface LiquidationStats {
  totalLiquidations: number;
  totalRecovered: string;
  totalWrittenOff: string;
  last24hCount: number;
}

export interface PriceData {
  price: string;
  priceUsd: number;
  decimals: number;
  roundId: string;
  updatedAt: number;
}

export interface BridgeConfig {
  bridgeAddress: string;
  requiredQuorum: number;
  totalAttestors: number;
  quorumWindowSeconds: number;
}

export interface AttestationHistoryItem {
  wallet: string;
  signal: string;
  source: string;
  evidence: string;
  timestamp: number;
  txHash: string;
}

export interface ComplianceStatus {
  wallet: string;
  isWhitelisted: boolean;
  isBlocked: boolean;
  countryBlocked: boolean;
  country: string;
  kycPassed: boolean;
}

export interface TierConfig {
  creditLimitUsdc: number;
  interestRateBps: number;
  minScore: number;
}

export interface PoolConfig {
  kinkBps: number;
  capBps: number;
  reserveFactorBps: number;
  maxUtilisationBps: number;
  tiers: Record<string, TierConfig>;
  maxScore: number;
  diamondScore: number;
  gracePeriodDays: number;
  onTimeRepaymentScoreGain: number;
  gracePeriodScoreHit: number;
  sbtStakeUsdc: number;
  sbtUnlockDays: number;
  signalDecayDays: number;
  signalExpiryWarningDays: number;
  limitIncreaseDays: number;
}
