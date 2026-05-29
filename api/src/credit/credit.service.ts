import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { CREDIT_LINE_MANAGER_ABI, RATE_LIMITER_ABI, SCORE_ENGINE_ABI } from '../contracts/abis';

const CREDIT_CACHE_TTL_MS = 60_000;

export interface CreditLine {
  wallet: string;
  limit: string;
  used: string;
  available: string;
  frozen: boolean;
  lastUpdated: number;
}

export interface RateLimitStatus {
  wallet: string;
  tier: number;
  dailyLimit: string;
  remaining: string;
  windowStart: number;
}

@Injectable()
export class CreditService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getCreditLine(wallet: `0x${string}`): Promise<CreditLine> {
    const cacheKey = `credit:line:${wallet.toLowerCase()}`;
    const cached = await this.cache.get<CreditLine>(cacheKey);
    if (cached) return cached;

    const clm = this.contracts.addr.creditLineManager;

    const [available, line] = await this.chain.publicClient.multicall({
      contracts: [
        { address: clm, abi: CREDIT_LINE_MANAGER_ABI, functionName: 'available', args: [wallet] },
        { address: clm, abi: CREDIT_LINE_MANAGER_ABI, functionName: 'getCreditLine', args: [wallet] },
      ],
      allowFailure: false,
    });

    const { limit, used, lastUpdated, frozen } = line as {
      limit: bigint;
      used: bigint;
      lastUpdated: number;
      frozen: boolean;
    };

    const result: CreditLine = {
      wallet,
      limit: limit.toString(),
      used: used.toString(),
      available: (available as bigint).toString(),
      frozen: Boolean(frozen),
      lastUpdated: Number(lastUpdated),
    };

    await this.cache.set(cacheKey, result, CREDIT_CACHE_TTL_MS);
    return result;
  }

  async getRateLimitStatus(wallet: `0x${string}`, tier: number): Promise<RateLimitStatus> {
    const cacheKey = `credit:ratelimit:${wallet.toLowerCase()}:${tier}`;
    const cached = await this.cache.get<RateLimitStatus>(cacheKey);
    if (cached) return cached;

    const rl = this.contracts.addr.rateLimiter;

    const [dailyLimit, remaining, windowData] = await this.chain.publicClient.multicall({
      contracts: [
        { address: rl, abi: RATE_LIMITER_ABI, functionName: 'dailyLimit', args: [tier] },
        { address: rl, abi: RATE_LIMITER_ABI, functionName: 'remaining', args: [wallet, tier] },
        { address: rl, abi: RATE_LIMITER_ABI, functionName: 'windows', args: [wallet] },
      ],
      allowFailure: false,
    });

    const [, windowStart] = windowData as [bigint, number];

    const result: RateLimitStatus = {
      wallet,
      tier,
      dailyLimit: (dailyLimit as bigint).toString(),
      remaining: (remaining as bigint).toString(),
      windowStart: Number(windowStart),
    };

    await this.cache.set(cacheKey, result, 30_000);
    return result;
  }
}
