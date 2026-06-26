import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { AppLogger } from '../logger/logger.service';
import { LENDING_POOL_ABI, ERC4626_ABI, RESERVE_MODULE_ABI, ERC20_ABI } from '../contracts/abis';
import { PoolStat } from '../database/entities/pool-stat.entity';
import { LpPosition } from '../database/entities/lp-position.entity';

const VAULT_CACHE_TTL_MS = 60_000;

export interface VaultStats {
  totalAssets: string;
  totalShares: string;
  outstandingLoans: string;
  utilisationBps: number;
  sharePrice: string;
  reserveBalance: string;
  maxUtilisationBps: number;
}

@Injectable()
export class VaultService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    private readonly logger: AppLogger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(PoolStat)
    private readonly poolStatRepo: Repository<PoolStat>,
    @InjectRepository(LpPosition)
    private readonly lpRepo: Repository<LpPosition>,
  ) {}

  async getVaultStats(): Promise<VaultStats> {
    const cacheKey = 'vault:stats';
    const cached = await this.cache.get<VaultStats>(cacheKey);
    if (cached) return cached;

    try {
      const pool = this.contracts.addr.lendingPool;
      const reserve = this.contracts.addr.reserveModule;
      const usdc = this.contracts.addr.usdc;

      const [
        totalAssets, totalSupply, totalOutstanding, totalDeposited,
        utilisationBps, reserveFactor, reserveBalance, usdcBalance,
      ] = await this.chain.publicClient.multicall({
        contracts: [
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalAssets' },
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalSupply' },
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalOutstanding' },
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'totalDeposited' },
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'getUtilisationBps' },
          { address: pool, abi: LENDING_POOL_ABI, functionName: 'reserveFactor' },
          { address: reserve, abi: RESERVE_MODULE_ABI, functionName: 'reserveBalance' },
          { address: usdc, abi: ERC20_ABI, functionName: 'balanceOf', args: [pool] },
        ],
        allowFailure: false,
      });

      const ta = totalAssets as bigint;
      const ts = totalSupply as bigint;
      const sharePrice = ts > 0n ? ((ta * BigInt(1e6)) / ts).toString() : '1000000';
      const utilBps = utilisationBps as bigint;

      const result: VaultStats = {
        totalAssets: ta.toString(),
        totalShares: ts.toString(),
        outstandingLoans: (totalOutstanding as bigint).toString(),
        utilisationBps: Number(utilBps),
        sharePrice,
        reserveBalance: (reserveBalance as bigint).toString(),
        maxUtilisationBps: Number(process.env.POOL_CAP_BPS ?? 9000),
      };
      await this.cache.set(cacheKey, result, VAULT_CACHE_TTL_MS);
      return result;
    } catch (err: any) {
      this.logger.warn(`getVaultStats on-chain failed, falling back to DB: ${err.message}`, 'VaultService');
    }

    const stat = await this.poolStatRepo.findOne({ where: {}, order: { snapshottedAt: 'DESC' } });
    const result: VaultStats = {
      totalAssets: stat?.totalValueLocked ?? '0',
      totalShares: '0',
      outstandingLoans: stat?.borrowed ?? '0',
      utilisationBps: stat?.utilisationBps ?? 0,
      reserveBalance: '0',
      sharePrice: '1000000',
      maxUtilisationBps: Number(process.env.POOL_CAP_BPS ?? 9000),
    };
    await this.cache.set(cacheKey, result, VAULT_CACHE_TTL_MS);
    return result;
  }

  async getSharesValue(wallet: `0x${string}`): Promise<{ wallet: string; shares: string; usdcValue: string }> {
    try {
      const pool = this.contracts.addr.lendingPool;
      const [shares, assetsValue] = await this.chain.publicClient.multicall({
        contracts: [
          { address: pool, abi: ERC4626_ABI, functionName: 'balanceOf', args: [wallet] },
          { address: pool, abi: ERC4626_ABI, functionName: 'convertToAssets', args: [1_000_000n] },
        ],
        allowFailure: false,
      });

      const sharesAmt = shares as bigint;
      const pricePerShare = assetsValue as bigint;
      const totalValue = (sharesAmt * pricePerShare) / BigInt(1e6);
      return { wallet, shares: sharesAmt.toString(), usdcValue: totalValue.toString() };
    } catch (err: any) {
      this.logger.warn(`getSharesValue on-chain failed, falling back to DB: ${err.message}`, 'VaultService');
    }

    const pos = await this.lpRepo.findOne({ where: { wallet: wallet.toLowerCase() } });
    return {
      wallet,
      shares: pos?.shares ?? '0',
      usdcValue: pos?.currentValue ? String(Math.round(parseFloat(pos.currentValue) * 1e6)) : '0',
    };
  }
}
