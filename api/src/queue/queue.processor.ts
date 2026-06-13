import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_SCORE_SYNC, QUEUE_PRICE_FETCH } from './queue.constants';
import { AppLogger } from '../logger/logger.service';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { ScoreRepository } from '../score/score.repository';
import { PriceService } from '../price/price.service';
import { REPUTATION_SBT_ABI } from '../contracts/abis';

export const JOB_SCORE_SYNC = 'score-sync';
export const JOB_PRICE_FETCH = 'price-fetch';

/** Maps a 0–1000 score to a tier label matching the protocol spec. */
function scoreToTier(score: number): string {
  if (score >= 801) return 'Diamond';
  if (score >= 601) return 'Platinum';
  if (score >= 401) return 'Gold';
  if (score >= 201) return 'Silver';
  return 'Bronze';
}

@Processor(QUEUE_SCORE_SYNC)
export class ScoreSyncProcessor {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    private readonly scoreRepo: ScoreRepository,
    private readonly logger: AppLogger,
  ) {}

  @Process(JOB_SCORE_SYNC)
  async handleScoreSync(job: Job<{ wallet: string }>): Promise<void> {
    const { wallet } = job.data;
    this.logger.log(`Processing score sync for ${wallet}`, 'ScoreSyncProcessor');

    try {
      const [rawScore, previousRecord] = await Promise.all([
        this.chain.publicClient.readContract({
          address: this.contracts.addr.reputationSbt,
          abi: REPUTATION_SBT_ABI,
          functionName: 'getScore',
          args: [wallet as `0x${string}`],
        }),
        this.scoreRepo.getLatest(wallet),
      ]);

      const score = Number(rawScore as unknown as bigint);
      const previousScore = previousRecord?.score ?? 0;

      // Only persist if the score actually changed to avoid redundant rows.
      if (score === previousScore && previousRecord !== null) {
        this.logger.debug(`Score unchanged (${score}) for ${wallet} — skipping write`, 'ScoreSyncProcessor');
        return;
      }

      await this.scoreRepo.create({
        wallet: wallet.toLowerCase(),
        score,
        previousScore,
        tier: scoreToTier(score),
        source: 'on_chain',
        recordedAt: new Date(),
      });

      this.logger.log(
        `Score sync complete for ${wallet}: ${previousScore} → ${score} (${scoreToTier(score)})`,
        'ScoreSyncProcessor',
      );
    } catch (err: any) {
      this.logger.error(`Score sync failed for ${wallet}: ${err.message}`, err.stack, 'ScoreSyncProcessor');
      throw err; // rethrow so Bull marks the job as failed and retries
    }
  }
}

@Processor(QUEUE_PRICE_FETCH)
export class PriceFetchProcessor {
  constructor(
    private readonly priceService: PriceService,
    private readonly logger: AppLogger,
  ) {}

  @Process(JOB_PRICE_FETCH)
  async handlePriceFetch(_job: Job): Promise<void> {
    this.logger.log('Processing price fetch', 'PriceFetchProcessor');

    try {
      const price = await this.priceService.getUsdcPrice();
      this.logger.log(
        `Price fetch complete: USDC/USD = ${price.priceUsd} (round ${price.roundId})`,
        'PriceFetchProcessor',
      );
    } catch (err: any) {
      this.logger.error(`Price fetch failed: ${err.message}`, err.stack, 'PriceFetchProcessor');
      throw err;
    }
  }
}
