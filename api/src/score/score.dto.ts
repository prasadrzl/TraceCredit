import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalletScoreDto {
  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM wallet address',
  })
  wallet: string;

  @ApiProperty({
    type: Number,
    example: 650,
    description: 'Reputation score in range 0–1000',
    minimum: 0,
    maximum: 1000,
  })
  score: number;

  @ApiProperty({
    type: String,
    example: 'Gold',
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    description: 'Score tier: Bronze(0-200), Silver(201-400), Gold(401-600), Platinum(601-800), Diamond(801-1000)',
  })
  tier: string;

  @ApiProperty({ type: Boolean, example: false, description: 'Whether the wallet holds a Soulbound Token' })
  hasSbt: boolean;

  @ApiProperty({ type: Boolean, example: false, description: 'Whether borrowing is temporarily frozen' })
  isFrozen: boolean;

  @ApiProperty({ type: Boolean, example: false, description: 'Whether the wallet is permanently blacklisted' })
  isBlacklisted: boolean;

  @ApiProperty({
    type: String,
    example: '5000000000',
    description: 'Maximum credit limit in USDC (6 decimals). Silver=500 USDC, Gold=5k, Platinum=25k, Diamond=100k',
  })
  creditLimit: string;

  @ApiProperty({
    type: String,
    example: '1400',
    description: 'Annual interest rate in basis points. Silver=1800, Gold=1400, Platinum=1000, Diamond=700',
  })
  interestRateBps: string;

  @ApiProperty({ type: Number, example: 1716000000, description: 'Unix timestamp (seconds) when SBT lockup expires' })
  lockupEnds: number;

  @ApiProperty({ type: Number, example: 1715900000, description: 'Unix timestamp (seconds) of last on-chain activity' })
  lastActivity: number;
}

export class ScoreHistoryItemDto {
  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM wallet address',
  })
  wallet: string;

  @ApiProperty({ type: Number, example: 650, description: 'Score after update', minimum: 0, maximum: 1000 })
  score: number;

  @ApiProperty({ type: Number, example: 600, description: 'Score before update', minimum: 0, maximum: 1000 })
  previousScore: number;

  @ApiProperty({
    type: String,
    example: 'Gold',
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    description: 'Tier after update',
  })
  tier: string;

  @ApiProperty({
    type: String,
    example: 'ON_TIME_REPAYMENT',
    description: 'Signal source that triggered the score change',
  })
  source: string;

  @ApiPropertyOptional({
    type: String,
    example: '0xabc123...def456',
    description: 'Transaction hash of the on-chain event (if available)',
  })
  txHash?: string;

  @ApiPropertyOptional({
    type: String,
    example: '19500000',
    description: 'Block number as string (if available)',
  })
  blockNumber?: string;

  @ApiProperty({
    type: String,
    example: '2024-05-18T12:00:00.000Z',
    description: 'ISO 8601 timestamp when the record was persisted',
  })
  recordedAt: string;
}
