import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { AppLogger } from '../logger/logger.service';
import { CREDIT_LINE_MANAGER_ABI, RATE_LIMITER_ABI } from '../contracts/abis';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';

const CREDIT_CACHE_TTL_MS = 60_000;

export interface CreditLine {
  wallet: string;
  limit: string;
  used: string;
  available: string;
  frozen: boolean;
  lastIncreaseAt: number;
}

export interface RateLimitStatus {
  wallet: string;
  tier: number;
  dailyLimit: string;
  remaining: string;
  windowUsed: string;
  windowResetsAt: number;
}

@Injectable()
export class CreditService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    private readonly logger: AppLogger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(BorrowerProfile)
    private readonly profileRepo: Repository<BorrowerProfile>,
  ) {}

  async getCreditLine(wallet: `0x${string}`): Promise<CreditLine> {
    const cacheKey = `credit:line:${wallet.toLowerCase()}`;
    const cached = await this.cache.get<CreditLine>(cacheKey);
    if (cached) return cached;

    try {
      const clm = this.contracts.addr.creditLineManager;
      const [available, line] = await this.chain.publicClient.multicall({
        contracts: [
          { address: clm, abi: CREDIT_LINE_MANAGER_ABI, functionName: 'available', args: [wallet] },
          { address: clm, abi: CREDIT_LINE_MANAGER_ABI, functionName: 'getCreditLine', args: [wallet] },
        ],
        allowFailure: false,
      });

      const { limit, used, lastIncreaseAt, frozen } = line as {
        limit: bigint; used: bigint; lastIncreaseAt: number; frozen: boolean;
      };

      const result: CreditLine = {
        wallet,
        limit: limit.toString(),
        used: used.toString(),
        available: (available as bigint).toString(),
        frozen: Boolean(frozen),
        lastIncreaseAt: Number(lastIncreaseAt),
      };
      await this.cache.set(cacheKey, result, CREDIT_CACHE_TTL_MS);
      return result;
    } catch (err: any) {
      this.logger.warn(`getCreditLine on-chain failed, falling back to DB: ${err.message}`, 'CreditService');
    }

    const profile = await this.profileRepo.findOne({ where: { wallet: wallet.toLowerCase() } });
    const limit = profile?.creditLimit ?? '0';
    const used = profile?.creditUsed ?? '0';
    const available = (parseFloat(limit) - parseFloat(used)).toFixed(2);

    const result: CreditLine = {
      wallet,
      limit: String(Math.round(parseFloat(limit) * 1e6)),
      used: String(Math.round(parseFloat(used) * 1e6)),
      available: String(Math.round(parseFloat(available) * 1e6)),
      frozen: false,
      lastIncreaseAt: 0,
    };
    await this.cache.set(cacheKey, result, CREDIT_CACHE_TTL_MS);
    return result;
  }

  async getRateLimitStatus(wallet: `0x${string}`, tier: number): Promise<RateLimitStatus> {
    const cacheKey = `credit:ratelimit:${wallet.toLowerCase()}:${tier}`;
    const cached = await this.cache.get<RateLimitStatus>(cacheKey);
    if (cached) return cached;

    try {
      const rl = this.contracts.addr.rateLimiter;
      const [dailyLimit, remaining, windowData] = await this.chain.publicClient.multicall({
        contracts: [
          { address: rl, abi: RATE_LIMITER_ABI, functionName: 'dailyLimit', args: [tier] },
          { address: rl, abi: RATE_LIMITER_ABI, functionName: 'remaining', args: [wallet, tier] },
          { address: rl, abi: RATE_LIMITER_ABI, functionName: 'windows', args: [wallet] },
        ],
        allowFailure: false,
      });

      const [windowUsed, windowStart] = windowData as unknown as [bigint, bigint];
      const windowResetsAt = Number(windowStart) + 86400;
      const result: RateLimitStatus = {
        wallet,
        tier,
        dailyLimit: (dailyLimit as bigint).toString(),
        remaining: (remaining as bigint).toString(),
        windowUsed: windowUsed.toString(),
        windowResetsAt,
      };
      await this.cache.set(cacheKey, result, 30_000);
      return result;
    } catch (err: any) {
      this.logger.warn(`getRateLimitStatus on-chain failed, falling back to DB: ${err.message}`, 'CreditService');
    }

    const profile = await this.profileRepo.findOne({ where: { wallet: wallet.toLowerCase() } });
    const dailyLimitRaw = profile?.rateLimit24h ? String(Math.round(parseFloat(profile.rateLimit24h) * 1e6)) : '0';
    const usedRaw = profile?.rateLimitUsed ? String(Math.round(parseFloat(profile.rateLimitUsed) * 1e6)) : '0';
    const remainingRaw = profile?.rateLimit24h && profile?.rateLimitUsed
      ? String(Math.round((parseFloat(profile.rateLimit24h) - parseFloat(profile.rateLimitUsed)) * 1e6))
      : dailyLimitRaw;
    const result: RateLimitStatus = {
      wallet,
      tier,
      dailyLimit: dailyLimitRaw,
      remaining: remainingRaw,
      windowUsed: usedRaw,
      windowResetsAt: Math.floor(Date.now() / 1000) + 86400,
    };
    await this.cache.set(cacheKey, result, 30_000);
    return result;
  }
}
