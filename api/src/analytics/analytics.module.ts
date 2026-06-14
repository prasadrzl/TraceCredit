import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { GraphModule } from '../graph/graph.module';
import { PoolStat } from '../database/entities/pool-stat.entity';
import { LoanSnapshot } from '../database/entities/loan-snapshot.entity';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';

@Module({
  imports: [
    GraphModule,
    TypeOrmModule.forFeature([PoolStat, LoanSnapshot, LiquidationRecord, BorrowerProfile]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
