import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { GraphService } from '../graph/graph.service';
import { LENDING_POOL_ABI, RESERVE_MODULE_ABI, ERC20_ABI } from '../contracts/abis';

const ANALYTICS_CACHE_TTL_MS = 300_000; // 5 min

export interface ProtocolAnalytics {
  tvlUsdc: string;
  totalBorrowed: string;
  totalRepaid: string;
  totalLiquidated: string;
  activeLoansCount: string;
  uniqueBorrowers: string;
  utilisationBps: string;
  utilisationPercent: string;
  reserveBalance: string;
  timestamp: number;
}

export interface TierDistribution {
  tier: string;
  count: number;
  totalCredit: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    private readonly graph: GraphService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getProtocolAnalytics(): Promise<ProtocolAnalytics> {
    const cacheKey = 'analytics:protocol';
    const cached = await this.cache.get<ProtocolAnalytics>(cacheKey);
    if (cached) return cached;

    const pool = this.contracts.addr.lendingPool;
    const reserve = this.contracts.addr.reserveModule;

    const [onChain, subgraphStats] = await Promise.all([
      this.chain.publicClient.multicall({
        contracts: [
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalAssets' },
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalOutstanding' },
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'getUtilisationBps' },
          { address: reserve, abi: RESERVE_MODULE_ABI, functionName: 'reserveBalance' },
        ],
        allowFailure: false,
      }),
      this.graph.getProtocolStats(),
    ]);

    const [tvl, outstanding, utilBps, reserveBal] = onChain;

    const result: ProtocolAnalytics = {
      tvlUsdc: (tvl as bigint).toString(),
      totalBorrowed: subgraphStats.totalBorrowed,
      totalRepaid: subgraphStats.totalRepaid,
      totalLiquidated: subgraphStats.totalLiquidated,
      activeLoansCount: subgraphStats.activeLoansCount,
      uniqueBorrowers: subgraphStats.uniqueBorrowers,
      utilisationBps: (utilBps as bigint).toString(),
      utilisationPercent: (Number(utilBps as bigint) / 100).toFixed(2),
      reserveBalance: (reserveBal as bigint).toString(),
      timestamp: Math.floor(Date.now() / 1000),
    };

    await this.cache.set(cacheKey, result, ANALYTICS_CACHE_TTL_MS);
    return result;
  }

  async getVolumeStats(
    days = 7,
  ): Promise<{ date: string; borrowVolume: string; repayVolume: string; liquidationVolume: string }[]> {
    const cacheKey = `analytics:volume:${days}`;
    const cached = await this.cache.get<
      { date: string; borrowVolume: string; repayVolume: string; liquidationVolume: string }[]
    >(cacheKey);
    if (cached) return cached;

    const subgraphData = await this.graph.getDailyVolume(days);

    let result: { date: string; borrowVolume: string; repayVolume: string; liquidationVolume: string }[];

    if (subgraphData.length > 0) {
      // Use real subgraph data, sorted oldest-first so the response is chronological.
      result = [...subgraphData]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({
          date: r.date,
          borrowVolume: r.borrowVolume,
          repayVolume: r.repayVolume,
          liquidationVolume: r.liquidationVolume,
        }));
    } else {
      // Subgraph not yet deployed or unavailable — return zero-padded calendar.
      const today = new Date();
      result = Array.from({ length: days }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (days - 1 - i));
        return {
          date: d.toISOString().split('T')[0],
          borrowVolume: '0',
          repayVolume: '0',
          liquidationVolume: '0',
        };
      });
    }

    await this.cache.set(cacheKey, result, ANALYTICS_CACHE_TTL_MS);
    return result;
  }
}
