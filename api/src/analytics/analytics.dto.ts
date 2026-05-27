import { ApiProperty } from '@nestjs/swagger';

export class ProtocolStatsDto {
  @ApiProperty({
    type: String,
    example: '10000000000',
    description: 'Total Value Locked across the protocol (USDC 6 decimals)',
  })
  tvl: string;

  @ApiProperty({
    type: String,
    example: '50000000000',
    description: 'Cumulative principal borrowed since protocol launch (USDC 6 decimals)',
  })
  totalVolumeBorrowed: string;

  @ApiProperty({
    type: String,
    example: '43500000000',
    description: 'Cumulative principal repaid since protocol launch (USDC 6 decimals)',
  })
  totalVolumeRepaid: string;

  @ApiProperty({
    type: String,
    example: '6500',
    description: 'Current pool utilisation in basis points (e.g. "6500" = 65%)',
  })
  utilisationBps: string;

  @ApiProperty({
    type: Number,
    example: 34,
    description: 'Number of wallets with at least one active loan',
  })
  activeBorrowers: number;

  @ApiProperty({
    type: Number,
    example: 5,
    description: 'Total number of liquidations ever executed',
  })
  totalLiquidations: number;

  @ApiProperty({
    type: Number,
    example: 1716000000,
    description: 'Unix timestamp (seconds) when this snapshot was last refreshed',
  })
  lastUpdated: number;
}

export class DailyVolumeDto {
  @ApiProperty({
    type: String,
    example: '2024-05-18',
    description: 'Calendar date in YYYY-MM-DD format (UTC)',
  })
  date: string;

  @ApiProperty({
    type: String,
    example: '2500000000',
    description: 'Total principal borrowed on this day (USDC 6 decimals)',
  })
  borrowVolume: string;

  @ApiProperty({
    type: String,
    example: '1800000000',
    description: 'Total principal repaid on this day (USDC 6 decimals)',
  })
  repayVolume: string;

  @ApiProperty({
    type: String,
    example: '0',
    description: 'Total principal recovered via liquidations on this day (USDC 6 decimals)',
  })
  liquidationVolume: string;
}
