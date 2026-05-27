import { ApiProperty } from '@nestjs/swagger';

export class PriceDto {
  @ApiProperty({
    type: String,
    example: 'USDC',
    description: 'Asset symbol',
  })
  asset: string;

  @ApiProperty({
    type: String,
    example: '100010000',
    description: 'Raw Chainlink price answer (8 decimals). Divide by 1e8 for USD value',
  })
  priceUsd: string;

  @ApiProperty({
    type: Number,
    example: 1.0001,
    description: 'Human-readable USD price (e.g. 1.0001)',
  })
  priceUsdHuman: number;

  @ApiProperty({
    type: String,
    example: '18446744073709557838',
    description: 'Chainlink round ID as string',
  })
  roundId: string;

  @ApiProperty({
    type: Number,
    example: 1716000000,
    description: 'Unix timestamp (seconds) of the Chainlink price update',
  })
  updatedAt: number;
}
