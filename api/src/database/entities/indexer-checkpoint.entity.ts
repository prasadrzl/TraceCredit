import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('indexer_checkpoints')
export class IndexerCheckpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Logical name for the stream: e.g. "liquidationManager:LoanLiquidated" */
  @Column({ name: 'stream_key', type: 'varchar', length: 120, unique: true })
  streamKey: string;

  /** Highest block number fully processed for this stream */
  @Column({ name: 'last_processed_block', type: 'bigint', default: '0' })
  lastProcessedBlock: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
