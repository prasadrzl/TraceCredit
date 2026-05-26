import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const QUEUE_LIQUIDATION = 'liquidation';
export const QUEUE_SCORE_SYNC = 'score-sync';
export const QUEUE_PRICE_FETCH = 'price-fetch';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('redis.url') ?? 'redis://localhost:6379';
        const url = new URL(redisUrl);
        return {
          redis: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
            db: 0,
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_LIQUIDATION },
      { name: QUEUE_SCORE_SYNC },
      { name: QUEUE_PRICE_FETCH },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
