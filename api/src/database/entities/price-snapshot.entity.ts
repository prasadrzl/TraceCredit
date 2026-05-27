import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('price_snapshots')
@Index(['asset'])
@Index(['recordedAt'])
export class PriceSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** e.g. USDC */
  @Column({ name: 'asset', type: 'varchar', length: 20 })
  asset: string;

  /** Price in USD with 8 decimal precision (Chainlink format) */
  @Column({ name: 'price_usd', type: 'numeric', precision: 30, scale: 8 })
  priceUsd: string;

  /** Raw Chainlink answer */
  @Column({ name: 'raw_answer', type: 'numeric', precision: 30, scale: 0 })
  rawAnswer: string;

  /** Chainlink round ID */
  @Column({ name: 'round_id', type: 'bigint', nullable: true })
  roundId: string;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
