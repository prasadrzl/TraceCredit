import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiquidationService } from './liquidation.service';
import { LiquidationController } from './liquidation.controller';
import { LiquidationRepository } from './liquidation.repository';
import { LiquidationBot } from './liquidation.bot';
import { LiquidationProcessor } from './liquidation.processor';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';
import { QUEUE_LIQUIDATION } from '../queue/queue.module';
import { GatewayModule } from '../gateway/gateway.module';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiquidationRecord]),
    BullModule.registerQueue({ name: QUEUE_LIQUIDATION }),
    GatewayModule,
    IndexerModule,
  ],
  providers: [
    LiquidationService,
    LiquidationRepository,
    LiquidationBot,
    LiquidationProcessor,
  ],
  controllers: [LiquidationController],
  exports: [LiquidationService],
})
export class LiquidationModule {}
