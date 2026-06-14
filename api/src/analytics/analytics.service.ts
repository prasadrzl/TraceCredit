import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { GraphService } from '../graph/graph.service';
import { AppLogger } from '../logger/logger.service';
import { LENDING_POOL_ABI, RESERVE_MODULE_ABI } from '../contracts/abis';
import { PoolStat } from '../database/entities/pool-stat.entity';
import { LoanSnapshot, LoanStatus } from '../database/entities/loan-snapshot.entity';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';

const ANALYTICS_CACHE_TTL_MS = 60_000;

export interface ProtocolStats {
  tvl: string;
  totalBorrowVolume: string;
  totalRepayVolume: string;
  activeBorrowers: number;
  totalBorrowers: number;
  utilisationBps: number;
  averageScore: number;
}

export interface DailyVolume {
  date: string;
  borrowVolume: string;
  repayVolume: string;
  liquidationVolume: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    private readonly graph: GraphService,
    private readonly logger: AppLogger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(PoolStat)
    private readonly poolStatRepo: Repository<PoolStat>,
    @InjectRepository(LoanSnapshot)
    private readonly loanRepo: Repository<LoanSnapshot>,
    @InjectRepository(LiquidationRecord)
    private readonly liqRepo: Repository<LiquidationRecord>,
    @InjectRepository(BorrowerProfile)
    private readonly profileRepo: Repository<BorrowerProfile>,
  ) {}

  async getProtocolAnalytics(): Promise<ProtocolStats> {
    const cacheKey = 'analytics:protocol';
    const cached = await this.cache.get<ProtocolStats>(cacheKey);
    if (cached) return cached;

    // Try on-chain + graph first
    try {
      const pool = this.contracts.addr.lendingPool;
      const reserve = this.contracts.addr.reserveModule;

      const [tvl, outstanding, utilBps, reserveBal] = await this.chain.publicClient.multicall({
        contracts: [
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalAssets' },
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalOutstanding' },
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'getUtilisationBps' },
          { address: reserve, abi: RESERVE_MODULE_ABI, functionName: 'reserveBalance' },
        ],
        allowFailure: false,
      });

      const graphStats = await this.graph.getProtocolStats();
      const avgScore = await this.profileRepo
        .createQueryBuilder('p')
        .select('AVG(p.score)', 'avg')
        .getRawOne<{ avg: string }>();

      const result: ProtocolStats = {
        tvl: (tvl as bigint).toString(),
        totalBorrowVolume: graphStats.totalBorrowed,
        totalRepayVolume: graphStats.totalRepaid,
        activeBorrowers: Number(graphStats.activeLoansCount),
        totalBorrowers: Number(graphStats.uniqueBorrowers),
        utilisationBps: Number(utilBps as bigint),
        averageScore: Math.round(parseFloat(avgScore?.avg ?? '0')),
      };
      await this.cache.set(cacheKey, result, ANALYTICS_CACHE_TTL_MS);
      return result;
    } catch (err: any) {
      this.logger.warn(`getProtocolAnalytics on-chain failed, falling back to DB: ${err.message}`, 'AnalyticsService');
    }

    // DB fallback
    const [stat, activeCount, totalBorrowVolume, totalRepayVolume, totalBorrowers, avgScore] =
      await Promise.all([
        this.poolStatRepo.findOne({ where: {}, order: { snapshottedAt: 'DESC' } }),
        this.loanRepo.count({ where: { status: LoanStatus.ACTIVE } }),
        this.loanRepo
          .createQueryBuilder('l')
          .select('SUM(CAST(l.principal AS numeric))', 'sum')
          .getRawOne<{ sum: string }>(),
        this.loanRepo
          .createQueryBuilder('l')
          .select('SUM(CAST(l.principal AS numeric))', 'sum')
          .where('l.status = :status', { status: LoanStatus.REPAID })
          .getRawOne<{ sum: string }>(),
        this.profileRepo.count(),
        this.profileRepo
          .createQueryBuilder('p')
          .select('AVG(p.score)', 'avg')
          .getRawOne<{ avg: string }>(),
      ]);

    // count distinct active borrowers
    const activeBorrowersRaw = await this.loanRepo
      .createQueryBuilder('l')
      .select('COUNT(DISTINCT l.borrower)', 'count')
      .where('l.status = :status', { status: LoanStatus.ACTIVE })
      .getRawOne<{ count: string }>();

    const result: ProtocolStats = {
      tvl: stat?.totalValueLocked ?? '0',
      totalBorrowVolume: totalBorrowVolume?.sum ?? '0',
      totalRepayVolume: totalRepayVolume?.sum ?? '0',
      activeBorrowers: Number(activeBorrowersRaw?.count ?? activeCount),
      totalBorrowers,
      utilisationBps: stat?.utilisationBps ?? 0,
      averageScore: Math.round(parseFloat(avgScore?.avg ?? '0')),
    };
    await this.cache.set(cacheKey, result, ANALYTICS_CACHE_TTL_MS);
    return result;
  }

  async getVolumeStats(days = 7): Promise<DailyVolume[]> {
    const cacheKey = `analytics:volume:${days}`;
    const cached = await this.cache.get<DailyVolume[]>(cacheKey);
    if (cached) return cached;

    // Try graph first
    const graphData = await this.graph.getDailyVolume(days);
    if (graphData.length > 0) {
      const result: DailyVolume[] = [...graphData]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({
          date: r.date,
          borrowVolume: r.borrowVolume,
          repayVolume: r.repayVolume,
          liquidationVolume: r.liquidationVolume ?? '0',
        }));
      await this.cache.set(cacheKey, result, ANALYTICS_CACHE_TTL_MS);
      return result;
    }

    // DB fallback — aggregate loan_snapshots and liquidation_records by calendar day
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [borrowRows, repayRows, liqRows] = await Promise.all([
      this.loanRepo
        .createQueryBuilder('l')
        .select("TO_CHAR(l.created_at, 'YYYY-MM-DD')", 'date')
        .addSelect('SUM(CAST(l.principal AS numeric))', 'volume')
        .where('l.created_at >= :since', { since })
        .groupBy("TO_CHAR(l.created_at, 'YYYY-MM-DD')")
        .getRawMany<{ date: string; volume: string }>(),
      this.loanRepo
        .createQueryBuilder('l')
        .select("TO_CHAR(l.updated_at, 'YYYY-MM-DD')", 'date')
        .addSelect('SUM(CAST(l.principal AS numeric))', 'volume')
        .where('l.status = :status', { status: LoanStatus.REPAID })
        .andWhere('l.updated_at >= :since', { since })
        .groupBy("TO_CHAR(l.updated_at, 'YYYY-MM-DD')")
        .getRawMany<{ date: string; volume: string }>(),
      this.liqRepo
        .createQueryBuilder('liq')
        .select("TO_CHAR(liq.liquidated_at, 'YYYY-MM-DD')", 'date')
        .addSelect('SUM(CAST(liq.recovered_amount AS numeric))', 'volume')
        .where('liq.liquidated_at >= :since', { since })
        .groupBy("TO_CHAR(liq.liquidated_at, 'YYYY-MM-DD')")
        .getRawMany<{ date: string; volume: string }>(),
    ]);

    const borrowMap = Object.fromEntries(borrowRows.map((r) => [r.date, r.volume]));
    const repayMap = Object.fromEntries(repayRows.map((r) => [r.date, r.volume]));
    const liqMap = Object.fromEntries(liqRows.map((r) => [r.date, r.volume]));

    const result: DailyVolume[] = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const date = d.toISOString().split('T')[0];
      return {
        date,
        borrowVolume: borrowMap[date] ?? '0',
        repayVolume: repayMap[date] ?? '0',
        liquidationVolume: liqMap[date] ?? '0',
      };
    });

    await this.cache.set(cacheKey, result, ANALYTICS_CACHE_TTL_MS);
    return result;
  }
}
