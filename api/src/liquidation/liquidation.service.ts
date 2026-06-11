import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LiquidationRepository } from './liquidation.repository';
import { GraphService } from '../graph/graph.service';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';

const STATS_CACHE_TTL_MS = 60_000; // 1 min

export interface LiquidationStats {
  total: number;
  totalRecovered: string;
  totalWrittenOff: string;
  last24hCount: number;
}

@Injectable()
export class LiquidationService {
  constructor(
    private readonly repo: LiquidationRepository,
    private readonly graph: GraphService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getRecentLiquidations(limit = 50): Promise<LiquidationRecord[]> {
    return this.repo.findAll(limit, 0);
  }

  async getLiquidationsByBorrower(borrower: string): Promise<LiquidationRecord[]> {
    return this.repo.findByBorrower(borrower);
  }

  async getLiquidationStats(): Promise<LiquidationStats> {
    const cacheKey = 'liquidation:stats';
    const cached = await this.cache.get<LiquidationStats>(cacheKey);
    if (cached) return cached;

    const stats = await this.repo.getStats();
    await this.cache.set(cacheKey, stats, STATS_CACHE_TTL_MS);
    return stats;
  }

  async recordLiquidation(data: {
    loanId: string;
    borrower: string;
    recoveredAmount: string;
    writtenOffAmount: string;
    txHash: string;
    blockNumber: string;
    liquidatedAt: Date;
  }): Promise<LiquidationRecord> {
    return this.repo.create(data);
  }
}
