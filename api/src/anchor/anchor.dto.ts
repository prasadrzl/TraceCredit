import { ApiProperty } from '@nestjs/swagger';

export class ComplianceStatusDto {
  @ApiProperty({
    type: String,
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    description: 'EVM wallet address that was checked',
  })
  wallet: string;

  @ApiProperty({
    type: String,
    example: 'US',
    description: 'ISO 3166-1 alpha-2 country code used for the geo-compliance check',
  })
  countryCode: string;

  @ApiProperty({
    type: Boolean,
    example: false,
    description: 'Whether the wallet is blocked due to sanctions or AML screening',
  })
  blocked: boolean;

  @ApiProperty({
    type: Boolean,
    example: false,
    description: 'Whether the wallet is blocked because its jurisdiction is restricted',
  })
  geoBlocked: boolean;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Convenience field: true when neither blocked nor geoBlocked',
  })
  isAllowed: boolean;

  @ApiProperty({
    type: Number,
    example: 1716000000,
    description: 'Unix timestamp (seconds) when the compliance check was performed',
  })
  checkedAt: number;
}
