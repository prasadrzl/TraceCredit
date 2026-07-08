import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoanSnapshot }      from './entities/loan-snapshot.entity';
import { LiquidationRecord } from './entities/liquidation-record.entity';
import { ScoreHistory }      from './entities/score-history.entity';
import { PriceSnapshot }     from './entities/price-snapshot.entity';
import { BorrowerProfile }   from './entities/borrower-profile.entity';
import { ScoreEvent }        from './entities/score-event.entity';
import { LpPosition }        from './entities/lp-position.entity';
import { PoolStat }          from './entities/pool-stat.entity';

const ALL_ENTITIES = [
  LoanSnapshot, LiquidationRecord, ScoreHistory, PriceSnapshot,
  BorrowerProfile, ScoreEvent, LpPosition, PoolStat,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: ALL_ENTITIES,
        // dev: auto-sync schema; preprod/prod: use migrations
        synchronize: config.get<string>('nodeEnv') === 'development',
        // migrations run on preprod/prod startup
        migrationsRun: config.get<string>('nodeEnv') !== 'development',
        migrations: [process.cwd() + '/src/database/migrations/*.{ts,js}'],
        logging: config.get<string>('nodeEnv') === 'development' ? ['query', 'error'] : ['error'],
        ssl: config.get<string>('nodeEnv') === 'production' ? { rejectUnauthorized: true } : false,
        poolSize: 20,
        connectTimeoutMS: 10_000,
      }),
    }),
  ],
})
export class DatabaseModule {}
