import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import {
  LENDING_POOL_ABI,
  INTEREST_ACCRUAL_ENGINE_ABI,
  FEE_COLLECTOR_ABI,
  ERC4626_ABI,
} from '../contracts/abis';

const YIELD_CACHE_TTL_MS = 60_000;

export interface ApyStats {
  /** Gross APY before fees (BPS, scaled ×100 → readable %) */
  grossApyBps: string;
  grossApyPercent: string;
  /** Net LP APY after reserve + DAO fee split */
  netLpApyPercent: string;
  utilisationBps: string;
  lpShareBps: number;
  reserveShareBps: number;
  daoShareBps: number;
}

export interface PendingYield {
  wallet: string;
  shares: string;
  pendingUsdc: string;
  apyPercent: string;
}

@Injectable()
export class YieldService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getApyStats(): Promise<ApyStats> {
    const cacheKey = 'yield:apy';
    const cached = await this.cache.get<ApyStats>(cacheKey);
    if (cached) return cached;

    const pool = this.contracts.addr.lendingPool;
    const iae = this.contracts.addr.interestAccrualEngine;
    const fee = this.contracts.addr.feeCollector;

    const [utilisationBps, lpShareBps, reserveShareBps, daoShareBps] =
      await this.chain.publicClient.multicall({
        contracts: [
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'getUtilisationBps' },
          { address: fee, abi: FEE_COLLECTOR_ABI, functionName: 'lpShareBps' },
          { address: fee, abi: FEE_COLLECTOR_ABI, functionName: 'reserveShareBps' },
          { address: fee, abi: FEE_COLLECTOR_ABI, functionName: 'daoShareBps' },
        ],
        allowFailure: false,
      });

    const utilBps = utilisationBps as bigint;

    /** Annualised rate from the jump-rate model in BPS */
    const annualRateBps = await this.chain.publicClient.readContract({
      address: iae,
      abi: INTEREST_ACCRUAL_ENGINE_ABI,
      functionName: 'calcRate',
      args: [utilBps],
    }) as bigint;

    const grossApyBps = annualRateBps;
    const grossApyPercent = (Number(grossApyBps) / 100).toFixed(4);

    const lpBps = Number(lpShareBps as bigint);
    const netLpApyPercent = ((Number(grossApyBps) * lpBps) / 10_000 / 100).toFixed(4);

    const result: ApyStats = {
      grossApyBps: grossApyBps.toString(),
      grossApyPercent,
      netLpApyPercent,
      utilisationBps: utilBps.toString(),
      lpShareBps: lpBps,
      reserveShareBps: Number(reserveShareBps as bigint),
      daoShareBps: Number(daoShareBps as bigint),
    };

    await this.cache.set(cacheKey, result, YIELD_CACHE_TTL_MS);
    return result;
  }

  async getPendingYield(wallet: `0x${string}`): Promise<PendingYield> {
    const pool = this.contracts.addr.lendingPool;

    const [shares, assetsFor1e6Shares, apy] = await Promise.all([
      this.chain.publicClient.readContract({
        address: pool,
        abi: ERC4626_ABI,
        functionName: 'balanceOf',
        args: [wallet],
      }) as Promise<bigint>,
      this.chain.publicClient.readContract({
        address: pool,
        abi: ERC4626_ABI,
        functionName: 'convertToAssets',
        args: [1_000_000n],
      }) as Promise<bigint>,
      this.getApyStats(),
    ]);

    /** Current USDC value of shares */
    const usdcValue = (shares * assetsFor1e6Shares) / BigInt(1e6);

    /** Estimated pending yield = usdcValue × netAPY (annualised, as fraction) */
    const netApyFraction = parseFloat(apy.netLpApyPercent) / 100;
    const pendingUsdc = BigInt(Math.floor(Number(usdcValue) * netApyFraction * (1 / 365)));

    return {
      wallet,
      shares: shares.toString(),
      pendingUsdc: pendingUsdc.toString(),
      apyPercent: apy.netLpApyPercent,
    };
  }
}
