import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load the right .env file based on NODE_ENV
const env = process.env.NODE_ENV ?? 'development';
dotenv.config({ path: path.resolve(__dirname, '../../', `.env.${env}`) });

import { LoanSnapshot }       from './entities/loan-snapshot.entity';
import { LiquidationRecord }  from './entities/liquidation-record.entity';
import { ScoreHistory }       from './entities/score-history.entity';
import { PriceSnapshot }      from './entities/price-snapshot.entity';
import { BorrowerProfile }    from './entities/borrower-profile.entity';
import { ScoreEvent }         from './entities/score-event.entity';
import { LpPosition }         from './entities/lp-position.entity';
import { PoolStat }           from './entities/pool-stat.entity';
import { IndexerCheckpoint }  from './entities/indexer-checkpoint.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    LoanSnapshot, LiquidationRecord, ScoreHistory, PriceSnapshot,
    BorrowerProfile, ScoreEvent, LpPosition, PoolStat, IndexerCheckpoint,
  ],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  // synchronize ONLY in development — migrations handle preprod/prod
  synchronize: env === 'development',
  logging: env === 'development' ? ['query', 'error'] : ['error'],
  ssl: env === 'production' ? { rejectUnauthorized: false } : false,
});
