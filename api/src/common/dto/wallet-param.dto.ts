import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress } from 'class-validator';

export class WalletParamDto {
  @ApiProperty({ description: 'EVM wallet address (checksummed or lowercase)', example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' })
  @IsEthereumAddress()
  wallet: string;
}
