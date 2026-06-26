import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { AppLogger } from '../logger/logger.service';
import { GraphService } from '../graph/graph.service';
import { LENDING_POOL_ABI, FEE_COLLECTOR_ABI } from '../contracts/abis';
import { LoanSnapshot, LoanStatus } from '../database/entities/loan-snapshot.entity';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';
import { PoolStat } from '../database/entities/pool-stat.entity';

export interface PoolOverview {
  totalAssets: string;
  totalOutstanding: string;
  utilisationBps: string;
  utilisationPercent: string;
  totalDeposited: string;
  paused: boolean;
}

export interface TierConfig {
  creditLimitUsdc: number;
  interestRateBps: number;
  minScore: number;
}

export interface PoolConfig {
  kinkBps: number;
  capBps: number;
  reserveFactorBps: number;
  maxUtilisationBps: number;
  tiers: Record<string, TierConfig>;
  maxScore: number;
  diamondScore: number;
  gracePeriodDays: number;
  onTimeRepaymentScoreGain: number;
  gracePeriodScoreHit: number;
  sbtStakeUsdc: number;
  sbtUnlockDays: number;
  signalDecayDays: number;
  signalExpiryWarningDays: number;
  limitIncreaseDays: number;
}

@Injectable()
export class PoolService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    private readonly logger: AppLogger,
    private readonly graph: GraphService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(LoanSnapshot)
    private readonly loanRepo: Repository<LoanSnapshot>,
    @InjectRepository(LiquidationRecord)
    private readonly liqRepo: Repository<LiquidationRecord>,
    @InjectRepository(PoolStat)
    private readonly poolStatRepo: Repository<PoolStat>,
  ) {}

  async getOverview(): Promise<PoolOverview> {
    const cacheKey = 'pool:overview';
    const cached = await this.cache.get<PoolOverview>(cacheKey);
    if (cached) return cached;

    try {
      const pool = this.contracts.addr.lendingPool;
      const [totalAssets, totalOutstanding, utilisationBps, totalDeposited] =
        await this.chain.publicClient.multicall({
          contracts: [
            { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalAssets' },
            { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalOutstanding' },
            { address: pool, abi: LENDING_POOL_ABI, functionName: 'getUtilisationBps' },
            { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalDeposited' },
          ],
          allowFailure: false,
        });

      const utilBps = utilisationBps as bigint;
      const result: PoolOverview = {
        totalAssets: (totalAssets as bigint).toString(),
        totalOutstanding: (totalOutstanding as bigint).toString(),
        utilisationBps: utilBps.toString(),
        utilisationPercent: (Number(utilBps) / 100).toFixed(2),
        totalDeposited: (totalDeposited as bigint).toString(),
        paused: false,
      };
      await this.cache.set(cacheKey, result, 60_000);
      return result;
    } catch (err: any) {
      this.logger.warn(`getOverview on-chain failed, falling back to DB: ${err.message}`, 'PoolService');
    }

    const stat = await this.poolStatRepo.findOne({ where: {}, order: { snapshottedAt: 'DESC' } });
    const result: PoolOverview = {
      totalAssets: stat?.totalLiquidity ?? '0',
      totalOutstanding: stat?.borrowed ?? '0',
      utilisationBps: String(stat?.utilisationBps ?? 0),
      utilisationPercent: ((stat?.utilisationBps ?? 0) / 100).toFixed(2),
      totalDeposited: stat?.totalValueLocked ?? '0',
      paused: false,
    };
    await this.cache.set(cacheKey, result, 60_000);
    return result;
  }

  async getPoolConfig(): Promise<PoolConfig> {
    const cacheKey = 'pool:config';
    const cached = await this.cache.get<PoolConfig>(cacheKey);
    if (cached) return cached;

    const kinkBps = Number(process.env.POOL_KINK_BPS ?? 7000);
    const capBps = Number(process.env.POOL_CAP_BPS ?? 9000);

    let reserveFactorBps = 1500;
    try {
      const fee = this.contracts.addr.feeCollector;
      const reserveShareBps = await this.chain.publicClient.readContract({
        address: fee,
        abi: FEE_COLLECTOR_ABI,
        functionName: 'reserveShareBps',
      });
      // @ts-ignore TS2352
      reserveFactorBps = Number(reserveShareBps as unknown as bigint);
    } catch {
      // fallback to default
    }

    const result: PoolConfig = {
      kinkBps,
      capBps,
      reserveFactorBps,
      maxUtilisationBps: capBps,
      tiers: {
        Bronze:   { creditLimitUsdc: 0,       interestRateBps: 1800, minScore: 0   },
        Silver:   { creditLimitUsdc: 500,      interestRateBps: 1800, minScore: 200 },
        Gold:     { creditLimitUsdc: 5000,     interestRateBps: 1400, minScore: 400 },
        Platinum: { creditLimitUsdc: 25000,    interestRateBps: 1000, minScore: 600 },
        Diamond:  { creditLimitUsdc: 100000,   interestRateBps: 700,  minScore: 800 },
      },
      maxScore: Number(process.env.MAX_SCORE ?? 1000),
      diamondScore: Number(process.env.DIAMOND_SCORE ?? 800),
      gracePeriodDays: Number(process.env.GRACE_PERIOD_DAYS ?? 7),
      onTimeRepaymentScoreGain: Number(process.env.REPAYMENT_SCORE_GAIN ?? 22),
      gracePeriodScoreHit: Number(process.env.GRACE_SCORE_HIT ?? 50),
      sbtStakeUsdc: Number(process.env.SBT_STAKE_USDC ?? 50),
      sbtUnlockDays: Number(process.env.SBT_UNLOCK_DAYS ?? 30),
      signalDecayDays: Number(process.env.SIGNAL_DECAY_DAYS ?? 90),
      signalExpiryWarningDays: Number(process.env.SIGNAL_EXPIRY_WARNING_DAYS ?? 14),
      limitIncreaseDays: Number(process.env.LIMIT_INCREASE_DAYS ?? 30),
    };
    await this.cache.set(cacheKey, result, 300_000);
    return result;
  }

  async getRecentBorrows(first = 20): Promise<LoanSnapshot[] | any[]> {
    const graphData = await this.graph.getActiveLoans(first);
    if (graphData.length > 0) return graphData;
    return this.loanRepo.find({
      where: { status: LoanStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      take: first,
    });
  }

  async getRecentLiquidations(first = 20): Promise<LiquidationRecord[] | any[]> {
    const graphData = await this.graph.getLiquidations(first);
    if (graphData.length > 0) return graphData;
    return this.liqRepo.find({
      order: { liquidatedAt: 'DESC' },
      take: first,
    });
  }

  async getAtRiskPositions(): Promise<any[]> {
    const loans = await this.loanRepo.find({
      where: { status: LoanStatus.GRACE_PERIOD },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return loans.map(l => ({
      borrower: l.borrower,
      tier: 'Bronze',
      debt: l.principal,
      ltv: 100,
      threshold: 100,
      health: 50,
    }));
  }

  async getProtocolHealth(utilisationBps: number): Promise<any[]> {
    const util = utilisationBps / 100;
    return [
      { name: 'LendingPool',   status: util >= 90 ? 'degraded' : 'operational' },
      { name: 'ReserveModule', status: 'operational' },
      { name: 'ScoreEngine',   status: 'operational' },
      { name: 'Subgraph',      status: 'operational' },
    ];
  }
}
