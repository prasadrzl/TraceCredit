import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('score_history')
@Index(['wallet'])
@Index(['recordedAt'])
export class ScoreHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet', type: 'varchar', length: 42 })
  wallet: string;

  /** Score value 0–1000 */
  @Column({ name: 'score', type: 'smallint' })
  score: number;

  /** Previous score for delta tracking */
  @Column({ name: 'previous_score', type: 'smallint', nullable: true })
  previousScore: number;

  @Column({ name: 'tier', type: 'varchar', length: 20, nullable: true })
  tier: string;

  /** Source: attestation | on_chain | decay */
  @Column({ name: 'source', type: 'varchar', length: 30, default: 'on_chain' })
  source: string;

  @Column({ name: 'tx_hash', type: 'varchar', length: 66, nullable: true })
  txHash: string;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: string;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
