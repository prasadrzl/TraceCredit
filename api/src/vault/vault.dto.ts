import { ApiProperty } from '@nestjs/swagger';

export class VaultStatsDto {
  @ApiProperty({
    type: String,
    example: '10000000000',
    description: 'Total Value Locked in the vault (USDC 6 decimals)',
  })
  tvl: string;

  @ApiProperty({
    type: String,
    example: '6500000000',
    description: 'Total outstanding principal across all active loans (USDC 6 decimals)',
  })
  totalOutstanding: string;

  @ApiProperty({
    type: String,
    example: '6500',
    description: 'Pool utilisation in basis points (e.g. "6500" = 65.00%)',
  })
  utilisationBps: string;

  @ApiProperty({
    type: Number,
    example: 65.0,
    description: 'Pool utilisation as a human-readable percentage (e.g. 65.00)',
  })
  utilisationPct: number;

  @ApiProperty({
    type: String,
    example: '1000100',
    description: 'Current share price — USDC value per 1e18 ERC-4626 shares (6 decimals)',
  })
  sharePrice: string;

  @ApiProperty({
    type: String,
    example: '500000000',
    description: 'Protocol reserve balance (USDC 6 decimals)',
  })
  reserveBalance: string;

  @ApiProperty({
    type: String,
    example: '9500000000000000000000',
    description: 'Total ERC-4626 shares outstanding (18 decimals, expressed as string)',
  })
  totalShares: string;
}

export class SharesValueDto {
  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM wallet address',
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
    example: '1000500000',
    description: 'Current USDC value of the wallet\'s shares (6 decimals)',
  })
  usdcValue: string;
}
