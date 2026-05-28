import { ApiProperty } from '@nestjs/swagger';

export class ApyStatsDto {
  @ApiProperty({
    type: String,
    example: '6500',
    description: 'Pool utilisation in basis points (e.g. "6500" = 65%)',
  })
  utilisationBps: string;

  @ApiProperty({
    type: String,
    example: '910',
    description: 'Gross protocol APY in basis points before the reserve cut',
  })
  grossApyBps: string;

  @ApiProperty({
    type: String,
    example: '773',
    description: 'Net LP APY in basis points after deducting the reserve factor',
  })
  netLpApyBps: string;

  @ApiProperty({
    type: Number,
    example: 9.1,
    description: 'Gross APY as a human-readable percentage (e.g. 9.10)',
  })
  grossApyPct: number;

  @ApiProperty({
    type: Number,
    example: 7.73,
    description: 'Net LP APY as a human-readable percentage (e.g. 7.73)',
  })
  netLpApyPct: number;

  @ApiProperty({
    type: Number,
    example: 15,
    description: 'Protocol reserve factor as a percentage (fixed at 15%)',
  })
  reserveFactorPct: number;
}

export class PendingYieldDto {
  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM wallet address of the LP',
  })
  wallet: string;

  @ApiProperty({
    type: String,
    example: '1000000000000000000000',
    description: 'ERC-4626 share balance of the wallet (18 decimals, as string)',
  })
  shares: string;

  @ApiProperty({
    type: String,
    example: '2119',
    description: 'Estimated daily USDC yield based on current APY (6 decimals)',
  })
  estimatedDailyUsdcYield: string;

  @ApiProperty({
    type: String,
    example: '773350',
    description: 'Estimated annual USDC yield based on current APY (6 decimals)',
  })
  annualUsdcYield: string;

  @ApiProperty({
    type: String,
    example: '773',
    description: 'Net LP APY in basis points used for this estimate',
  })
  netApyBps: string;
}
