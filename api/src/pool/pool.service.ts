import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { GraphService } from '../graph/graph.service';
import { LENDING_POOL_ABI } from '../contracts/abis';

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
    private readonly graph: GraphService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getOverview(): Promise<PoolOverview> {
    const cacheKey = 'pool:overview';
    const cached = await this.cache.get<PoolOverview>(cacheKey);
    if (cached) return cached;

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
  }

  async getRecentBorrows(first = 20) {
    return this.graph.getActiveLoans(first, 0);
  }

  async getRecentLiquidations(first = 20) {
    return this.graph.getLiquidations(first, 0);
  }
}
