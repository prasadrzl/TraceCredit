# Database Seeds

## Setup (first time)

1. Make sure PostgreSQL is running locally
2. Create the dev database:
   ```sql
   CREATE DATABASE tracecredit_dev;
   ```
3. Copy env file:
   ```bash
   cp .env.example .env.development
   # edit DATABASE_URL if your postgres user/password differs
   ```
4. Start the API once so TypeORM auto-creates all tables (synchronize: true in dev):
   ```bash
   npm run start:dev
   # wait for "Application is running" then Ctrl+C
   ```
5. Run the seed:
   ```bash
   npm run seed:dev
   ```

## What gets seeded

| Table               | Rows | Notes |
|---------------------|------|-------|
| price_snapshots     | 100  | 100 days of USDC/USD Chainlink prices |
| pool_stats          | 100  | Daily pool utilisation snapshots |
| borrower_profiles   | 100  | 1 = your wallet (0x0de0...), 99 generated |
| loan_snapshots      | 100  | 12 for your wallet, 88 generated |
| liquidation_records | 100  | 8 matching UI mock, 92 generated |
| score_history       | 100  | 15 for your wallet, 85 generated |
| score_events        | 100  | 12 for your wallet, 88 generated |
| lp_positions        | 100  | 1 for your wallet ($10k deposit), 99 generated |

## Re-seeding

The seed script truncates all tables before inserting, so it is safe to run multiple times:
```bash
npm run seed:dev
```

## Migrations (preprod / prod)

```bash
# After changing an entity, generate a migration:
npm run migration:generate -- src/database/migrations/AddNewColumn

# Apply migrations on preprod/prod:
npm run migration:run

# Roll back the last migration if something breaks:
npm run migration:revert
```
