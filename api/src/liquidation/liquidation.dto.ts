import { ApiProperty } from '@nestjs/swagger';

export class LiquidationRecordDto {
  @ApiProperty({
    type: String,
    example: '7',
    description: 'Internal liquidation record ID',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: '42',
    description: 'On-chain loan ID that was liquidated',
  })
  loanId: string;

  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM address of the borrower whose loan was liquidated',
  })
  borrower: string;

  @ApiProperty({
    type: String,
    example: '800000000',
    description: 'Amount recovered from collateral / reserves (USDC 6 decimals)',
  })
  recoveredAmount: string;

  @ApiProperty({
    type: String,
    example: '200000000',
    description: 'Amount written off as bad debt (USDC 6 decimals)',
  })
  writtenOffAmount: string;

  @ApiProperty({
    type: String,
    example: '0xabc123...def456',
    description: 'Transaction hash of the liquidation event',
  })
  txHash: string;

  @ApiProperty({
    type: String,
    example: '19500100',
    description: 'Block number at which the liquidation was executed (as string)',
  })
  blockNumber: string;

  @ApiProperty({
    type: String,
    example: '2024-05-18T14:30:00.000Z',
    description: 'ISO 8601 timestamp when the liquidation occurred',
  })
  liquidatedAt: string;
}

export class LiquidationStatsDto {
  @ApiProperty({
    type: Number,
    example: 5,
    description: 'Total number of liquidations ever executed',
  })
  total: number;

  @ApiProperty({
    type: String,
    example: '4000000000',
    description: 'Total USDC recovered across all liquidations (6 decimals)',
  })
  totalRecovered: string;

  @ApiProperty({
    type: String,
    example: '1000000000',
    description: 'Total USDC written off as bad debt (6 decimals)',
  })
  totalWrittenOff: string;

  @ApiProperty({
    type: Number,
    example: 1,
    description: 'Number of liquidations in the past 24 hours',
  })
  last24hCount: number;
}
