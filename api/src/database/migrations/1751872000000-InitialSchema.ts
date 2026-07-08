import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1751872000000 implements MigrationInterface {
  name = 'InitialSchema1751872000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // uuid_generate_v4() must exist before any table that uses it as a default
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "loan_snapshots" (
        "id"               UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "loan_id"          BIGINT            NOT NULL,
        "borrower"         VARCHAR(42)       NOT NULL,
        "principal"        NUMERIC(30,0)     NOT NULL,
        "accrued_interest" NUMERIC(30,0)     NOT NULL DEFAULT '0',
        "due_at"           BIGINT            NOT NULL,
        "status"           VARCHAR(20)       NOT NULL DEFAULT 'active',
        "rate_bps"         INTEGER           NOT NULL,
        "block_number"     BIGINT,
        "created_at"       TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_snapshots" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_loan_snapshots_loan_id" ON "loan_snapshots" ("loan_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_loan_snapshots_borrower"  ON "loan_snapshots" ("borrower")`);
    await queryRunner.query(`CREATE INDEX "IDX_loan_snapshots_status"    ON "loan_snapshots" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "borrower_profiles" (
        "id"                UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "wallet"            VARCHAR(42)   NOT NULL,
        "score"             SMALLINT      NOT NULL DEFAULT 0,
        "tier"              VARCHAR(20)   NOT NULL DEFAULT 'Bronze',
        "credit_limit"      NUMERIC(20,2) NOT NULL DEFAULT '0',
        "credit_used"       NUMERIC(20,2) NOT NULL DEFAULT '0',
        "interest_rate_bps" INTEGER       NOT NULL DEFAULT 1400,
        "rate_limit_24h"    NUMERIC(20,2) NOT NULL DEFAULT '0',
        "rate_limit_used"   NUMERIC(20,2) NOT NULL DEFAULT '0',
        "sbt_minted"        BOOLEAN       NOT NULL DEFAULT false,
        "sbt_token_id"      BIGINT,
        "next_tier"         VARCHAR(20),
        "next_tier_score"   SMALLINT,
        "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_borrower_profiles" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_borrower_profiles_wallet" ON "borrower_profiles" ("wallet")`);

    await queryRunner.query(`
      CREATE TABLE "score_history" (
        "id"             UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "wallet"         VARCHAR(42) NOT NULL,
        "score"          SMALLINT    NOT NULL,
        "previous_score" SMALLINT,
        "tier"           VARCHAR(20),
        "source"         VARCHAR(30) NOT NULL DEFAULT 'on_chain',
        "tx_hash"        VARCHAR(66),
        "block_number"   BIGINT,
        "recorded_at"    TIMESTAMPTZ NOT NULL,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_score_history" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_score_history_wallet"      ON "score_history" ("wallet")`);
    await queryRunner.query(`CREATE INDEX "IDX_score_history_recorded_at" ON "score_history" ("recorded_at")`);

    await queryRunner.query(`
      CREATE TABLE "liquidation_records" (
        "id"                UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "loan_id"           BIGINT      NOT NULL,
        "borrower"          VARCHAR(42) NOT NULL,
        "recovered_amount"  NUMERIC(30,0) NOT NULL,
        "written_off_amount" NUMERIC(30,0) NOT NULL DEFAULT '0',
        "tx_hash"           VARCHAR(66) NOT NULL,
        "block_number"      BIGINT      NOT NULL,
        "liquidated_at"     TIMESTAMPTZ NOT NULL,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_liquidation_records"           PRIMARY KEY ("id"),
        CONSTRAINT "UQ_liquidation_records_tx_loan"   UNIQUE ("tx_hash", "loan_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_liquidation_records_loan_id"  ON "liquidation_records" ("loan_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_liquidation_records_borrower" ON "liquidation_records" ("borrower")`);
    await queryRunner.query(`CREATE INDEX "IDX_liquidation_records_tx_hash"  ON "liquidation_records" ("tx_hash")`);

    await queryRunner.query(`
      CREATE TABLE "score_events" (
        "id"                  UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "wallet"              VARCHAR(42) NOT NULL,
        "signal_type"         VARCHAR(40) NOT NULL,
        "signal_sub"          VARCHAR(100) NOT NULL,
        "source"              VARCHAR(100) NOT NULL,
        "source_type"         VARCHAR(30)  NOT NULL,
        "delta"               SMALLINT    NOT NULL,
        "score_after"         SMALLINT    NOT NULL,
        "tx_hash"             VARCHAR(66),
        "block_number"        BIGINT,
        "attestation_uid"     VARCHAR(66),
        "attestation_payload" JSONB,
        "occurred_at"         TIMESTAMPTZ NOT NULL,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_score_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_score_events_wallet"      ON "score_events" ("wallet")`);
    await queryRunner.query(`CREATE INDEX "IDX_score_events_signal_type" ON "score_events" ("signal_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_score_events_occurred_at" ON "score_events" ("occurred_at")`);

    await queryRunner.query(`
      CREATE TABLE "lp_positions" (
        "id"               UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "wallet"           VARCHAR(42)   NOT NULL,
        "usdc_deposited"   NUMERIC(20,2) NOT NULL DEFAULT '0',
        "shares"           NUMERIC(30,8) NOT NULL DEFAULT '0',
        "share_price"      NUMERIC(20,8) NOT NULL DEFAULT '1',
        "current_value"    NUMERIC(20,2) NOT NULL DEFAULT '0',
        "interest_earned"  NUMERIC(20,2) NOT NULL DEFAULT '0',
        "pool_share_bps"   INTEGER       NOT NULL DEFAULT 0,
        "apy_bps"          INTEGER       NOT NULL DEFAULT 0,
        "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lp_positions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_lp_positions_wallet" ON "lp_positions" ("wallet")`);

    await queryRunner.query(`
      CREATE TABLE "pool_stats" (
        "id"                UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "total_liquidity"   NUMERIC(30,2) NOT NULL,
        "borrowed"          NUMERIC(30,2) NOT NULL DEFAULT '0',
        "available"         NUMERIC(30,2) NOT NULL DEFAULT '0',
        "utilisation_bps"   INTEGER       NOT NULL DEFAULT 0,
        "below_kink_apr_bps" INTEGER      NOT NULL DEFAULT 0,
        "above_kink_apr_bps" INTEGER      NOT NULL DEFAULT 0,
        "kink_bps"          INTEGER       NOT NULL DEFAULT 8000,
        "lp_apy_bps"        INTEGER       NOT NULL DEFAULT 0,
        "total_value_locked" NUMERIC(30,2) NOT NULL DEFAULT '0',
        "active_borrowers"  INTEGER       NOT NULL DEFAULT 0,
        "snapshotted_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pool_stats" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "price_snapshots" (
        "id"          UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "asset"       VARCHAR(20)   NOT NULL,
        "price_usd"   NUMERIC(30,8) NOT NULL,
        "raw_answer"  NUMERIC(30,0) NOT NULL,
        "round_id"    BIGINT,
        "recorded_at" TIMESTAMPTZ   NOT NULL,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_snapshots" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_price_snapshots_asset"       ON "price_snapshots" ("asset")`);
    await queryRunner.query(`CREATE INDEX "IDX_price_snapshots_recorded_at" ON "price_snapshots" ("recorded_at")`);

    await queryRunner.query(`
      CREATE TABLE "indexer_checkpoints" (
        "id"                   UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "stream_key"           VARCHAR(120) NOT NULL,
        "last_processed_block" BIGINT       NOT NULL DEFAULT '0',
        "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_indexer_checkpoints"          PRIMARY KEY ("id"),
        CONSTRAINT "UQ_indexer_checkpoints_stream"   UNIQUE ("stream_key")
      )
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "indexer_checkpoints"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "price_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pool_stats"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lp_positions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "score_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "liquidation_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "score_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "borrower_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_snapshots"`);
  }
}
