import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { AppLogger } from '../logger/logger.service';
import { GraphService } from '../graph/graph.service';
import { LENDING_POOL_ABI } from '../contracts/abis';
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
}
