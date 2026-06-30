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

  private static readonly FALLBACK_APY: ApyStats = {
    grossApyBps: '1200',
    grossApyPercent: '12.0000',
    netLpApyPercent: '9.6000',
    utilisationBps: '6500',
    lpShareBps: 8000,
    reserveShareBps: 1500,
    daoShareBps: 500,
  };

  async getApyStats(): Promise<ApyStats> {
    const cacheKey = 'yield:apy';
    const cached = await this.cache.get<ApyStats>(cacheKey);
    if (cached) return cached;

    try {
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

      const annualRateBps = await this.chain.publicClient.readContract({
        address: iae,
        abi: INTEREST_ACCRUAL_ENGINE_ABI,
        functionName: 'calcRate',
        args: [utilBps],
      }) as bigint;

      const grossApyBps = annualRateBps;
      const grossApyPercent = (Number(grossApyBps) / 100).toFixed(4);
      const lpBps = Number(lpShareBps as unknown as bigint);
      const netLpApyPercent = ((Number(grossApyBps) * lpBps) / 10_000 / 100).toFixed(4);

      const result: ApyStats = {
        grossApyBps: grossApyBps.toString(),
        grossApyPercent,
        netLpApyPercent,
        utilisationBps: utilBps.toString(),
        lpShareBps: lpBps,
        reserveShareBps: Number(reserveShareBps as unknown as bigint),
        daoShareBps: Number(daoShareBps as unknown as bigint),
      };
      await this.cache.set(cacheKey, result, YIELD_CACHE_TTL_MS);
      return result;
    } catch {
      await this.cache.set(cacheKey, YieldService.FALLBACK_APY, YIELD_CACHE_TTL_MS);
      return YieldService.FALLBACK_APY;
    }
  }

  async getPendingYield(wallet: `0x${string}`): Promise<PendingYield> {
    const cacheKey = `yield:pending:${wallet.toLowerCase()}`;
    const cached = await this.cache.get<PendingYield>(cacheKey);
    if (cached) return cached;

    const apy = await this.getApyStats();

    try {
      const pool = this.contracts.addr.lendingPool;
      const [shares, assetsFor1e6Shares] = await Promise.all([
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
      ]);

      const usdcValue = (shares * assetsFor1e6Shares) / BigInt(1e6);
      const netApyFraction = parseFloat(apy.netLpApyPercent) / 100;
      const pendingUsdc = BigInt(Math.floor(Number(usdcValue) * netApyFraction * (1 / 365)));
      const result: PendingYield = { wallet, shares: shares.toString(), pendingUsdc: pendingUsdc.toString(), apyPercent: apy.netLpApyPercent };
      await this.cache.set(cacheKey, result, 30_000);
      return result;
    } catch {
      return { wallet, shares: '0', pendingUsdc: '0', apyPercent: apy.netLpApyPercent };
    }
  }
}
