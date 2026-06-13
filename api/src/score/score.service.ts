import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { REPUTATION_SBT_ABI, SCORE_ENGINE_ABI } from '../contracts/abis';
import { ScoreRepository } from './score.repository';
import { AppLogger } from '../logger/logger.service';
import { GraphService } from '../graph/graph.service';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';
import { ScoreEvent } from '../database/entities/score-event.entity';

export enum ScoreTier {
  NONE = 'None',
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum',
  DIAMOND = 'Diamond',
}

/** Credit limits in USDC (6 decimals) */
export const TIER_CREDIT_LIMITS: Record<ScoreTier, bigint> = {
  [ScoreTier.NONE]: 0n,
  [ScoreTier.BRONZE]: 0n,
  [ScoreTier.SILVER]: 500_000_000n,   // 500 USDC
  [ScoreTier.GOLD]: 5_000_000_000n,   // 5,000 USDC
  [ScoreTier.PLATINUM]: 25_000_000_000n, // 25,000 USDC
  [ScoreTier.DIAMOND]: 100_000_000_000n, // 100,000 USDC
};

export interface WalletScore {
  wallet: string;
  score: number;
  tier: ScoreTier;
  hasSbt: boolean;
  isFrozen: boolean;
  isBlacklisted: boolean;
  creditLimit: string;
  interestRateBps: string;
  lockupEnds: number;
  lastActivity: number;
}

const SCORE_CACHE_TTL_MS = 60_000;

function tierFromOnChain(tierIndex: number): ScoreTier {
  const tiers = [ScoreTier.NONE, ScoreTier.BRONZE, ScoreTier.SILVER, ScoreTier.GOLD, ScoreTier.PLATINUM, ScoreTier.DIAMOND];
  return tiers[tierIndex] ?? ScoreTier.NONE;
}

@Injectable()
export class ScoreService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly repo: ScoreRepository,
    private readonly graph: GraphService,
    private readonly logger: AppLogger,
    @InjectRepository(BorrowerProfile)
    private readonly profileRepo: Repository<BorrowerProfile>,
    @InjectRepository(ScoreEvent)
    private readonly eventRepo: Repository<ScoreEvent>,
  ) {}

  async getWalletScore(wallet: `0x${string}`): Promise<WalletScore> {
    const cacheKey = `score:${wallet.toLowerCase()}`;
    const cached = await this.cache.get<WalletScore>(cacheKey);
    if (cached) return cached;

    try {
      const sbt = this.contracts.addr.reputationSbt;
      const se = this.contracts.addr.scoreEngine;

      const [score, hasSbt, isFrozen, isBlacklisted, tierIndex, creditLimit, rateBps, lockup, lastActivity] =
        await this.chain.publicClient.multicall({
          contracts: [
            { address: sbt, abi: REPUTATION_SBT_ABI, functionName: 'getScore', args: [wallet] },
            { address: sbt, abi: REPUTATION_SBT_ABI, functionName: 'hasSBT', args: [wallet] },
            { address: sbt, abi: REPUTATION_SBT_ABI, functionName: 'isFrozen', args: [wallet] },
            { address: sbt, abi: REPUTATION_SBT_ABI, functionName: 'isBlacklisted', args: [wallet] },
            { address: se, abi: SCORE_ENGINE_ABI, functionName: 'getCreditTier', args: [wallet] },
            { address: se, abi: SCORE_ENGINE_ABI, functionName: 'getCreditLimit', args: [wallet] },
            { address: se, abi: SCORE_ENGINE_ABI, functionName: 'getInterestRateBps', args: [wallet] },
            { address: se, abi: SCORE_ENGINE_ABI, functionName: 'getLimitLockup', args: [wallet] },
            { address: se, abi: SCORE_ENGINE_ABI, functionName: 'lastActivity', args: [wallet] },
          ],
          allowFailure: false,
        });

      const tier = tierFromOnChain(Number(tierIndex));
      const result: WalletScore = {
        wallet,
        score: Number(score),
        tier,
        hasSbt: Boolean(hasSbt),
        isFrozen: Boolean(isFrozen),
        isBlacklisted: Boolean(isBlacklisted),
        creditLimit: (creditLimit as bigint).toString(),
        interestRateBps: (rateBps as bigint).toString(),
        lockupEnds: Number(lockup),
        lastActivity: Number(lastActivity),
      };
      await this.cache.set(cacheKey, result, SCORE_CACHE_TTL_MS);
      return result;
    } catch (err: any) {
      this.logger.warn(`getWalletScore on-chain failed, falling back to DB: ${err.message}`, 'ScoreService');
    }

    const profile = await this.profileRepo.findOne({ where: { wallet: wallet.toLowerCase() } });
    const result: WalletScore = {
      wallet,
      score: profile?.score ?? 0,
      tier: (profile?.tier ?? ScoreTier.NONE) as ScoreTier,
      hasSbt: profile?.sbtMinted ?? false,
      isFrozen: false,
      isBlacklisted: false,
      creditLimit: profile?.creditLimit ? String(Math.round(parseFloat(profile.creditLimit) * 1e6)) : '0',
      interestRateBps: String(profile?.interestRateBps ?? 0),
      lockupEnds: 0,
      lastActivity: 0,
    };
    await this.cache.set(cacheKey, result, SCORE_CACHE_TTL_MS);
    return result;
  }

  async getScoreHistory(wallet: string, limit = 50) {
    const graphData = await this.graph.getScoreHistory(wallet, limit);
    if (graphData.length > 0) return graphData;
    return this.repo.findByWallet(wallet.toLowerCase(), limit);
  }

  async getDbScoreHistory(wallet: string, limit = 50) {
    return this.repo.findByWallet(wallet, limit);
  }

  async recordScoreUpdate(params: {
    wallet: string;
    score: number;
    previousScore: number;
    tier: string;
    source: string;
    txHash?: string;
    blockNumber?: string;
  }): Promise<void> {
    await this.repo.create({
      ...params,
      recordedAt: new Date(),
    });
  }

  async getBorrowerProfile(wallet: string): Promise<BorrowerProfile | null> {
    return this.profileRepo.findOne({ where: { wallet: wallet.toLowerCase() } });
  }

  async getScoreEvents(wallet: string, limit = 50): Promise<ScoreEvent[]> {
    return this.eventRepo.find({
      where: { wallet: wallet.toLowerCase() },
      order: { occurredAt: 'DESC' },
      take: limit,
    });
  }
}
