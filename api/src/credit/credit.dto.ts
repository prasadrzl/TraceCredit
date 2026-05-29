import { ApiProperty } from '@nestjs/swagger';

export class CreditLineDto {
  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM wallet address',
  })
  wallet: string;

  @ApiProperty({
    type: String,
    example: '5000000000',
    description: 'Maximum credit limit in USDC (6 decimals)',
  })
  limit: string;

  @ApiProperty({
    type: String,
    example: '1000000000',
    description: 'Amount currently borrowed / in use (USDC 6 decimals)',
  })
  used: string;

  @ApiProperty({
    type: String,
    example: '4000000000',
    description: 'Remaining borrowable amount (USDC 6 decimals)',
  })
  available: string;

  @ApiProperty({ type: Boolean, example: false, description: 'Whether new borrows are frozen for this wallet' })
  frozen: boolean;

  @ApiProperty({
    type: String,
    example: 'Gold',
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    description: 'Current score tier determining the credit limit',
  })
  tier: string;

  @ApiProperty({
    type: String,
    example: '1400',
    description: 'Annual interest rate in basis points (e.g. "1400" = 14%)',
  })
  interestRateBps: string;
}

export class RateLimitStatusDto {
  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM wallet address',
  })
  wallet: string;

  @ApiProperty({
    type: Number,
    example: 3,
    description: 'Numeric tier index: 0=None, 1=Bronze, 2=Silver, 3=Gold, 4=Platinum, 5=Diamond',
    minimum: 0,
    maximum: 5,
  })
  tier: number;

  @ApiProperty({
    type: String,
    example: '5000000000',
    description: 'Maximum allowed borrow within the rolling 24-hour window (USDC 6 decimals)',
  })
  dailyLimit: string;

  @ApiProperty({
    type: String,
    example: '1000000000',
    description: 'Amount borrowed in the current 24-hour window (USDC 6 decimals)',
  })
  windowUsed: string;

  @ApiProperty({
    type: String,
    example: '4000000000',
    description: 'Remaining borrow capacity in the current window (USDC 6 decimals)',
  })
  remaining: string;

  @ApiProperty({
    type: Number,
    example: 1716086400,
    description: 'Unix timestamp (seconds) when the current rate-limit window resets',
  })
  windowResetsAt: number;
}
