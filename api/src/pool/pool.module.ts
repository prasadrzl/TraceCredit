import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoolService } from './pool.service';
import { PoolController } from './pool.controller';
import { GraphModule } from '../graph/graph.module';
import { LoanSnapshot } from '../database/entities/loan-snapshot.entity';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';
import { PoolStat } from '../database/entities/pool-stat.entity';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';

@Module({
  imports: [GraphModule, TypeOrmModule.forFeature([LoanSnapshot, LiquidationRecord, PoolStat, BorrowerProfile])],
  providers: [PoolService],
  controllers: [PoolController],
  exports: [PoolService],
})
export class PoolModule {}
