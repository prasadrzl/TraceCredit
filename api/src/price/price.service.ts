import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { CHAINLINK_AGGREGATOR_ABI } from '../contracts/abis';
import { PriceSnapshot } from '../database/entities/price-snapshot.entity';
import { AppLogger } from '../logger/logger.service';

const PRICE_CACHE_KEY = 'price:usdc:usd';
const PRICE_TTL_MS = 30_000; // 30s

export interface UsdcPrice {
  asset: string;
  priceUsd: string;
  rawAnswer: string;
  roundId: string;
  updatedAt: number;
  decimals: number;
}

@Injectable()
export class PriceService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(PriceSnapshot)
    private readonly snapshotRepo: Repository<PriceSnapshot>,
    private readonly logger: AppLogger,
  ) {}

  async getUsdcPrice(): Promise<UsdcPrice> {
    const cached = await this.cache.get<UsdcPrice>(PRICE_CACHE_KEY);
    if (cached) return cached;

    const feed = this.contracts.addr.chainlinkUsdcUsd;

    try {
      const [roundData, decimals] = await Promise.all([
        this.chain.publicClient.readContract({
          address: feed,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: 'latestRoundData',
        }),
        this.chain.publicClient.readContract({
          address: feed,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: 'decimals',
        }),
      ]);

      const [roundId, answer, , updatedAt] = roundData as [bigint, bigint, bigint, bigint, bigint];
      const dec = decimals as number;
      const priceUsd = (Number(answer) / 10 ** dec).toFixed(8);

      const result: UsdcPrice = {
        asset: 'USDC',
        priceUsd,
        rawAnswer: answer.toString(),
        roundId: roundId.toString(),
        updatedAt: Number(updatedAt),
        decimals: dec,
      };

      await this.cache.set(PRICE_CACHE_KEY, result, PRICE_TTL_MS);
      await this.persistSnapshot(result);
      return result;
    } catch (err: any) {
      this.logger.warn(`getUsdcPrice on-chain failed, falling back to DB: ${err.message}`, 'PriceService');
    }

    const snap = await this.snapshotRepo.findOne({
      where: { asset: 'USDC' },
      order: { recordedAt: 'DESC' },
    });

    const result: UsdcPrice = {
      asset: 'USDC',
      priceUsd: snap?.priceUsd ?? '1.00000000',
      rawAnswer: snap?.rawAnswer ?? '100000000',
      roundId: snap?.roundId ?? '0',
      updatedAt: snap ? Math.floor(new Date(snap.recordedAt).getTime() / 1000) : 0,
      decimals: 8,
    };

    await this.cache.set(PRICE_CACHE_KEY, result, PRICE_TTL_MS);
    return result;
  }

  async getPriceHistory(limit = 100): Promise<PriceSnapshot[]> {
    return this.snapshotRepo.find({
      where: { asset: 'USDC' },
      order: { recordedAt: 'DESC' },
      take: limit,
    });
  }

  private async persistSnapshot(price: UsdcPrice): Promise<void> {
    try {
      const snap = this.snapshotRepo.create({
        asset: price.asset,
        priceUsd: price.priceUsd,
        rawAnswer: price.rawAnswer,
        roundId: price.roundId,
        recordedAt: new Date(price.updatedAt * 1000),
      });
      await this.snapshotRepo.save(snap);
    } catch (err: any) {
      this.logger.warn(`Failed to persist price snapshot: ${err.message}`, 'PriceService');
    }
  }
}
