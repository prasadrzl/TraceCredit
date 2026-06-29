import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Infrastructure
import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { DatabaseModule } from './database/database.module';
import { ChainModule } from './chain/chain.module';
import { ContractsModule } from './contracts/contracts.module';
import { RedisCacheModule } from './cache/cache.module';
import { QueueModule } from './queue/queue.module';
import { GraphModule } from './graph/graph.module';

// Feature modules
import { HealthModule } from './health/health.module';
import { PriceModule } from './price/price.module';
import { ScoreModule } from './score/score.module';
import { CreditModule } from './credit/credit.module';
import { PositionsModule } from './positions/positions.module';
import { VaultModule } from './vault/vault.module';
import { YieldModule } from './yield/yield.module';
import { PoolModule } from './pool/pool.module';
import { AnchorModule } from './anchor/anchor.module';
import { AttestationModule } from './attestation/attestation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GatewayModule } from './gateway/gateway.module';
import { LiquidationModule } from './liquidation/liquidation.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { IndexerModule } from './indexer/indexer.module';

@Module({
  imports: [
    // Infrastructure (order matters — config must be first)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AppConfigModule,
    LoggerModule,
    DatabaseModule,
    ChainModule,
    ContractsModule,
    RedisCacheModule,
    QueueModule,
    GraphModule,

    // Feature modules
    HealthModule,
    PriceModule,
    ScoreModule,
    CreditModule,
    PositionsModule,
    VaultModule,
    YieldModule,
    PoolModule,
    AnchorModule,
    AttestationModule,
    AnalyticsModule,
    GatewayModule,
    LiquidationModule,
    PortfolioModule,
    IndexerModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
  ],
})
export class AppModule {}
