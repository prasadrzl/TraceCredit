import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndexerService } from './indexer.service';
import { IndexerCheckpoint } from '../database/entities/indexer-checkpoint.entity';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';
import { LoanSnapshot } from '../database/entities/loan-snapshot.entity';
import { GatewayModule } from '../gateway/gateway.module';
import { ChainModule } from '../chain/chain.module';
import { ContractsModule } from '../contracts/contracts.module';
import { GraphModule } from '../graph/graph.module';
import { AppConfigModule } from '../config/config.module';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forFeature([IndexerCheckpoint, LiquidationRecord, LoanSnapshot]),
    GatewayModule,
    ChainModule,
    ContractsModule,
    GraphModule,
  ],
  providers: [IndexerService],
  exports: [IndexerService],
})
export class IndexerModule {}
