import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_SCORE_SYNC, QUEUE_PRICE_FETCH } from './queue.module';
import { AppLogger } from '../logger/logger.service';

export const JOB_SCORE_SYNC = 'score-sync';
export const JOB_PRICE_FETCH = 'price-fetch';

@Processor(QUEUE_SCORE_SYNC)
export class ScoreSyncProcessor {
  constructor(private readonly logger: AppLogger) {}

  @Process(JOB_SCORE_SYNC)
  async handleScoreSync(job: Job<{ wallet: string }>): Promise<void> {
    this.logger.log(`Processing score sync for ${job.data.wallet}`, 'ScoreSyncProcessor');
  }
}

@Processor(QUEUE_PRICE_FETCH)
export class PriceFetchProcessor {
  constructor(private readonly logger: AppLogger) {}

  @Process(JOB_PRICE_FETCH)
  async handlePriceFetch(job: Job): Promise<void> {
    this.logger.log('Processing price fetch', 'PriceFetchProcessor');
  }
}
