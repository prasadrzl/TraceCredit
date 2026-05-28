import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { WHITELIST_REGISTRY_ABI } from '../contracts/abis';

const ANCHOR_CACHE_TTL_MS = 60_000;

export interface WalletComplianceStatus {
  wallet: string;
  isBlocked: boolean;
  isCountryBlocked: boolean;
  isAllowed: boolean;
  countryCode: string;
}

@Injectable()
export class AnchorService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getComplianceStatus(
    wallet: `0x${string}`,
    countryCode = 'US',
  ): Promise<WalletComplianceStatus> {
    const cacheKey = `anchor:${wallet.toLowerCase()}:${countryCode}`;
    const cached = await this.cache.get<WalletComplianceStatus>(cacheKey);
    if (cached) return cached;

    const reg = this.contracts.addr.whitelistRegistry;
    /** bytes2 country code */
    const country = this.encodeCountry(countryCode);

    const [isBlocked, isCountryBlocked, isAllowed] = await this.chain.publicClient.multicall({
      contracts: [
        { address: reg, abi: WHITELIST_REGISTRY_ABI, functionName: 'blocked', args: [wallet] },
        { address: reg, abi: WHITELIST_REGISTRY_ABI, functionName: 'geoBlocked', args: [country] },
        { address: reg, abi: WHITELIST_REGISTRY_ABI, functionName: 'isAllowed', args: [wallet, country] },
      ],
      allowFailure: false,
    });

    const result: WalletComplianceStatus = {
      wallet,
      isBlocked: Boolean(isBlocked),
      isCountryBlocked: Boolean(isCountryBlocked),
      isAllowed: Boolean(isAllowed),
      countryCode,
    };

    await this.cache.set(cacheKey, result, ANCHOR_CACHE_TTL_MS);
    return result;
  }

  /** Encode a 2-char ISO country code to bytes2 */
  private encodeCountry(code: string): `0x${string}` {
    const padded = (code + '  ').slice(0, 2);
    const buf = Buffer.from(padded, 'ascii');
    return `0x${buf.toString('hex')}` as `0x${string}`;
  }
}
