import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { LENDING_POOL_ABI, ERC4626_ABI, RESERVE_MODULE_ABI, ERC20_ABI } from '../contracts/abis';

const VAULT_CACHE_TTL_MS = 60_000;

export interface VaultStats {
  totalAssets: string;
  totalSupply: string;
  totalOutstanding: string;
  totalDeposited: string;
  utilisationBps: string;
  utilisationPercent: string;
  reserveFactor: number;
  reserveBalance: string;
  sharePrice: string;
  usdcBalance: string;
}

@Injectable()
export class VaultService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getVaultStats(): Promise<VaultStats> {
    const cacheKey = 'vault:stats';
    const cached = await this.cache.get<VaultStats>(cacheKey);
    if (cached) return cached;

    const pool = this.contracts.addr.lendingPool;
    const reserve = this.contracts.addr.reserveModule;
    const usdc = this.contracts.addr.usdc;

    const [
      totalAssets,
      totalSupply,
      totalOutstanding,
      totalDeposited,
      utilisationBps,
      reserveFactor,
      reserveBalance,
      usdcBalance,
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

    /** Share price = totalAssets / totalSupply in USDC units (6 decimals) */
    const ta = totalAssets as bigint;
    const ts = totalSupply as bigint;
    const sharePrice = ts > 0n ? ((ta * BigInt(1e6)) / ts).toString() : '1000000';

    const utilBps = utilisationBps as bigint;

    const result: VaultStats = {
      totalAssets: ta.toString(),
      totalSupply: ts.toString(),
      totalOutstanding: (totalOutstanding as bigint).toString(),
      totalDeposited: (totalDeposited as bigint).toString(),
      utilisationBps: utilBps.toString(),
      utilisationPercent: (Number(utilBps) / 100).toFixed(2),
      reserveFactor: Number(reserveFactor),
      reserveBalance: (reserveBalance as bigint).toString(),
      sharePrice,
      usdcBalance: (usdcBalance as bigint).toString(),
    };

    await this.cache.set(cacheKey, result, VAULT_CACHE_TTL_MS);
    return result;
  }

  async getSharesValue(wallet: `0x${string}`): Promise<{ wallet: string; shares: string; assetsValue: string }> {
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

    return {
      wallet,
      shares: sharesAmt.toString(),
      assetsValue: totalValue.toString(),
    };
  }
}
