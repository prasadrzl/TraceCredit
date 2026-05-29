import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { LiquidationBot, JOB_LIQUIDATION_SCAN } from './liquidation.bot';
import { QUEUE_LIQUIDATION } from '../queue/queue.module';
import { AppLogger } from '../logger/logger.service';

@Processor(QUEUE_LIQUIDATION)
export class LiquidationProcessor {
  constructor(
    private readonly bot: LiquidationBot,
    private readonly logger: AppLogger,
  ) {}

  @Process(JOB_LIQUIDATION_SCAN)
  async handleLiquidationScan(job: Job): Promise<void> {
    this.logger.debug(`Processing liquidation scan job ${job.id}`, 'LiquidationProcessor');
    await this.bot.scanAndLiquidate();
  }
}
