import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ChainHealthIndicator } from './chain.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [ChainHealthIndicator],
})
export class HealthModule {}
