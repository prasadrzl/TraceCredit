import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BridgeConfigDto {
  @ApiProperty({
    type: String,
    example: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
    description: 'On-chain address of the AttestationBridge contract',
  })
  address: string;

  @ApiProperty({
    type: Number,
    example: 3,
    description: 'Minimum number of oracle signatures required to commit a score update (M of N)',
  })
  requiredQuorum: number;

  @ApiProperty({
    type: Number,
    example: 3600,
    description: 'Time window (seconds) within which the quorum signatures must be collected',
  })
  quorumWindowSeconds: number;
}

export class AttestationHistoryItemDto {
  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM wallet address whose score was updated',
  })
  wallet: string;

  @ApiProperty({
    type: String,
    example: 'ON_TIME_REPAYMENT',
    description: 'Signal type that triggered the attestation (e.g. ON_TIME_REPAYMENT, DEFAULT)',
  })
  signalType: string;

  @ApiProperty({
    type: Number,
    example: 650,
    description: 'Score after the attestation was applied',
    minimum: 0,
    maximum: 1000,
  })
  score: number;

  @ApiProperty({
    type: Number,
    example: 600,
    description: 'Score before the attestation was applied',
    minimum: 0,
    maximum: 1000,
  })
  previousScore: number;

  @ApiPropertyOptional({
    type: String,
    example: '0xabc123...def456',
    description: 'Transaction hash of the on-chain attestation commit (if available)',
  })
  txHash?: string;

  @ApiProperty({
    type: Number,
    example: 1716000000,
    description: 'Unix timestamp (seconds) when the attestation was recorded on-chain',
  })
  timestamp: number;
}
