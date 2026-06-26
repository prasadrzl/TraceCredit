import { ApiProperty } from '@nestjs/swagger';

export class PoolOverviewDto {
  @ApiProperty({
    type: String,
    example: '10000000000',
    description: 'Total Value Locked in the pool (USDC 6 decimals)',
  })
  tvl: string;

  @ApiProperty({
    type: String,
    example: '6500000000',
    description: 'Total outstanding principal across all active loans (USDC 6 decimals)',
  })
  totalBorrowed: string;

  @ApiProperty({
    type: String,
    example: '6500',
    description: 'Pool utilisation in basis points (e.g. "6500" = 65%)',
  })
  utilisationBps: string;

  @ApiProperty({
    type: Number,
    example: 12,
    description: 'Number of loans currently in Active or GracePeriod state',
  })
  activeLoanCount: number;

  @ApiProperty({
    type: Number,
    example: 58,
    description: 'Total number of loans ever originated (all states)',
  })
  totalLoanCount: number;

  @ApiProperty({
    type: Number,
    example: 34,
    description: 'Number of distinct borrower addresses',
  })
  uniqueBorrowers: number;
}

export class BorrowEventDto {
  @ApiProperty({
    type: String,
    example: '42',
    description: 'On-chain loan ID as string',
  })
  loanId: string;

  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM address of the borrower',
  })
  borrower: string;

  @ApiProperty({
    type: String,
    example: '1000000000',
    description: 'Principal amount borrowed (USDC 6 decimals)',
  })
  amount: string;

  @ApiProperty({
    type: Number,
    example: 1716000000,
    description: 'Unix timestamp (seconds) of the borrow event',
  })
  timestamp: number;

  @ApiProperty({
    type: String,
    example: '0xabc123...def456',
    description: 'Transaction hash of the borrow event',
  })
  txHash: string;
}

export class PoolConfigDto {
  @ApiProperty({ type: Number, example: 7000 })
  kinkBps: number;

  @ApiProperty({ type: Number, example: 9000 })
  capBps: number;

  @ApiProperty({ type: Number, example: 1500 })
  reserveFactorBps: number;

  @ApiProperty({ type: Number, example: 9000 })
  maxUtilisationBps: number;

  @ApiProperty({ example: { Bronze: { creditLimitUsdc: 0, interestRateBps: 1800, minScore: 0 } } })
  tiers: Record<string, { creditLimitUsdc: number; interestRateBps: number; minScore: number }>;

  @ApiProperty({ type: Number, example: 1000 })
  maxScore: number;

  @ApiProperty({ type: Number, example: 800 })
  diamondScore: number;

  @ApiProperty({ type: Number, example: 7 })
  gracePeriodDays: number;

  @ApiProperty({ type: Number, example: 22 })
  onTimeRepaymentScoreGain: number;

  @ApiProperty({ type: Number, example: 50 })
  gracePeriodScoreHit: number;

  @ApiProperty({ type: Number, example: 50 })
  sbtStakeUsdc: number;

  @ApiProperty({ type: Number, example: 30 })
  sbtUnlockDays: number;

  @ApiProperty({ type: Number, example: 90 })
  signalDecayDays: number;

  @ApiProperty({ type: Number, example: 14 })
  signalExpiryWarningDays: number;

  @ApiProperty({ type: Number, example: 30 })
  limitIncreaseDays: number;
}
