import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { AppLogger } from '../logger/logger.service';
import { GraphService } from '../graph/graph.service';
import { IndexerService } from '../indexer/indexer.service';
import { LENDING_POOL_ABI, FEE_COLLECTOR_ABI } from '../contracts/abis';
import { LoanSnapshot, LoanStatus } from '../database/entities/loan-snapshot.entity';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';
import { PoolStat } from '../database/entities/pool-stat.entity';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';

export interface RecentBorrowEvent {
  loanId: string;
  borrower: string;
  amount: string;
  rateBps: number;
  tier: string;
  score: number;
  timestamp: number;
  txHash: string;
}

export interface RecentLiquidationEvent {
  loanId: string;
  borrower: string;
  recoveredAmount: string;
  writtenOffAmount: string;
  txHash: string;
  tier: string;
  score: number;
  liquidatedAt: string;
}

export interface AtRiskPosition {
  borrower: string;
  tier: string;
  score: number;
  debt: string;
  ltv: number;
  threshold: number;
  health: number;
}

export interface ProtocolHealthComponent {
  name: string;
  status: 'operational' | 'degraded' | 'down';
}

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
    private readonly indexer: IndexerService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(LoanSnapshot)
    private readonly loanRepo: Repository<LoanSnapshot>,
    @InjectRepository(LiquidationRecord)
    private readonly liqRepo: Repository<LiquidationRecord>,
    @InjectRepository(PoolStat)
    private readonly poolStatRepo: Repository<PoolStat>,
    @InjectRepository(BorrowerProfile)
    private readonly profileRepo: Repository<BorrowerProfile>,
  ) {}

  private async profileMap(wallets: string[]): Promise<Map<string, BorrowerProfile>> {
    if (wallets.length === 0) return new Map();
    const unique = [...new Set(wallets.map(w => w.toLowerCase()))];
    const profiles = await this.profileRepo.createQueryBuilder('p')
      .where('LOWER(p.wallet) IN (:...wallets)', { wallets: unique })
      .getMany();
    return new Map(profiles.map(p => [p.wallet.toLowerCase(), p]));
  }

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

  async getRecentBorrows(first = 20): Promise<RecentBorrowEvent[]> {
    const graphData = await this.graph.getActiveLoans(first);
    if (graphData.length > 0) {
      return graphData.map(l => ({
        loanId: l.loanId,
        borrower: l.borrower,
        amount: l.principal,
        rateBps: Number(l.rateBps ?? 0),
        tier: 'Bronze',
        score: 0,
        timestamp: Number(l.dueTime ?? 0),
        txHash: '',
      }));
    }
    const loans = await this.loanRepo.find({
      where: { status: LoanStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      take: first,
    });
    const profiles = await this.profileMap(loans.map(l => l.borrower));
    return loans.map(l => {
      const p = profiles.get(l.borrower.toLowerCase());
      return {
        loanId: l.loanId,
        borrower: l.borrower,
        amount: l.principal,
        rateBps: l.rateBps,
        tier: p?.tier ?? 'Bronze',
        score: p?.score ?? 0,
        timestamp: Math.floor(new Date(l.createdAt).getTime() / 1000),
        txHash: l.blockNumber ?? '',
      };
    });
  }

  async getRecentLiquidations(first = 20): Promise<RecentLiquidationEvent[]> {
    const graphData = await this.graph.getLiquidations(first);
    if (graphData.length > 0) {
      return graphData.map(l => ({
        loanId: l.loanId,
        borrower: l.borrower,
        recoveredAmount: l.recoveredAmount ?? '0',
        writtenOffAmount: '0',
        txHash: l.txHash ?? '',
        tier: 'Bronze',
        score: 0,
        liquidatedAt: l.timestamp ? new Date(Number(l.timestamp) * 1000).toISOString() : new Date().toISOString(),
      }));
    }
    const records = await this.liqRepo.find({
      order: { liquidatedAt: 'DESC' },
      take: first,
    });
    const profiles = await this.profileMap(records.map(r => r.borrower));
    return records.map(r => {
      const p = profiles.get(r.borrower.toLowerCase());
      return {
        loanId: r.loanId,
        borrower: r.borrower,
        recoveredAmount: r.recoveredAmount,
        writtenOffAmount: r.writtenOffAmount,
        txHash: r.txHash,
        tier: p?.tier ?? 'Bronze',
        score: p?.score ?? 0,
        liquidatedAt: r.liquidatedAt?.toISOString() ?? '',
      };
    });
  }

  async getAtRiskPositions(): Promise<AtRiskPosition[]> {
    const loans = await this.loanRepo.find({
      where: { status: LoanStatus.GRACE_PERIOD },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    const profiles = await this.profileMap(loans.map(l => l.borrower));
    return loans.map(l => {
      const p = profiles.get(l.borrower.toLowerCase());
      return {
        borrower: l.borrower,
        tier: p?.tier ?? 'Bronze',
        score: p?.score ?? 0,
        debt: l.principal,
        ltv: 100,
        threshold: 100,
        health: 50,
      };
    });
  }

  async getProtocolHealth(utilisationBps: number): Promise<ProtocolHealthComponent[]> {
    const util = utilisationBps / 100;
    const subgraphHealthy = await this.indexer.isSubgraphHealthy().catch(() => false);

    const [reserveOk, scoreOk] = await Promise.all([
      this.chain.publicClient.readContract({
        address: this.contracts.addr.reserveModule,
        abi: [{ name: 'reserveBalance', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] }] as const,
        functionName: 'reserveBalance',
      }).then(() => true).catch(() => false),
      this.chain.publicClient.readContract({
        address: this.contracts.addr.scoreEngine,
        abi: [{ name: 'getCreditTier', type: 'function', stateMutability: 'view', inputs: [{ name: 'wallet', type: 'address' }], outputs: [{ name: '', type: 'uint8' }] }] as const,
        functionName: 'getCreditTier',
        args: ['0x0000000000000000000000000000000000000001'],
      }).then(() => true).catch(() => false),
    ]);

    return [
      { name: 'LendingPool',   status: util >= 90 ? 'degraded' : 'operational' },
      { name: 'ReserveModule', status: reserveOk ? 'operational' : 'down' },
      { name: 'ScoreEngine',   status: scoreOk ? 'operational' : 'down' },
      { name: 'Subgraph',      status: subgraphHealthy ? 'operational' : 'degraded' },
    ];
  }
}
