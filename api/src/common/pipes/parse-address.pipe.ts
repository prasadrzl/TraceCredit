import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isAddress, getAddress } from 'viem';

@Injectable()
export class ParseAddressPipe implements PipeTransform<string, `0x${string}`> {
  transform(value: string): `0x${string}` {
    if (!isAddress(value)) {
      throw new BadRequestException(`Invalid Ethereum address: ${value}`);
    }
    return getAddress(value) as `0x${string}`;
  }
}
