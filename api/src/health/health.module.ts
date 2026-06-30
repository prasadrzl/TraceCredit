import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ChainHealthIndicator } from './chain.health';
import { RedisHealthIndicator } from './redis.health';
import { SubgraphHealthIndicator } from './subgraph.health';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
  imports: [TerminusModule, IndexerModule],
  controllers: [HealthController],
  providers: [ChainHealthIndicator, RedisHealthIndicator, SubgraphHealthIndicator],
})
export class HealthModule {}
