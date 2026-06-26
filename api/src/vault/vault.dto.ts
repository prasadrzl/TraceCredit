import { ApiProperty } from '@nestjs/swagger';

export class VaultStatsDto {
  @ApiProperty({ type: String, example: '10000000000', description: 'Total Value Locked (USDC 6 decimals)' })
  totalAssets: string;

  @ApiProperty({ type: String, example: '9500000000000000000000', description: 'Total ERC-4626 shares outstanding' })
  totalShares: string;

  @ApiProperty({ type: String, example: '6500000000', description: 'Total outstanding principal (USDC 6 decimals)' })
  outstandingLoans: string;

  @ApiProperty({ type: Number, example: 6500, description: 'Pool utilisation in basis points' })
  utilisationBps: number;

  @ApiProperty({ type: String, example: '1000100', description: 'Share price — USDC per 1e6 shares (6 decimals)' })
  sharePrice: string;

  @ApiProperty({ type: String, example: '500000000', description: 'Protocol reserve balance (USDC 6 decimals)' })
  reserveBalance: string;

  @ApiProperty({ type: Number, example: 9000, description: 'Max utilisation cap in BPS' })
  maxUtilisationBps: number;
}

export class SharesValueDto {
  @ApiProperty({ type: String, example: '0x1234...5678', description: 'Wallet address' })
  wallet: string;

  @ApiProperty({ type: String, example: '1000000000000000000', description: 'LP share balance (18 decimals)' })
  shares: string;

  @ApiProperty({ type: String, example: '1001000', description: 'USDC value of shares (6 decimals)' })
  usdcValue: string;
}
