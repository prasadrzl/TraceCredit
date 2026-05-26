import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum ScoreSignalType {
  ON_TIME_REPAYMENT        = 'ON_TIME_REPAYMENT',
  PARTIAL_REPAYMENT        = 'PARTIAL_REPAYMENT',
  LATE_REPAYMENT           = 'LATE_REPAYMENT',
  DAO_VOTE                 = 'DAO_VOTE',
  CROSS_PROTOCOL_REPAYMENT = 'CROSS_PROTOCOL_REPAYMENT',
  ATTESTATION_RECEIVED     = 'ATTESTATION_RECEIVED',
  WALLET_AGE               = 'WALLET_AGE',
  KYC_VERIFIED             = 'KYC_VERIFIED',
  DECAY                    = 'DECAY',
}

@Entity('score_events')
@Index(['wallet'])
@Index(['signalType'])
@Index(['occurredAt'])
export class ScoreEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet', type: 'varchar', length: 42 })
  wallet: string;

  @Column({ name: 'signal_type', type: 'varchar', length: 40 })
  signalType: string;

  /** Human-readable label for the signal */
  @Column({ name: 'signal_sub', type: 'varchar', length: 100 })
  signalSub: string;

  /** Source description e.g. "Loan #38", "Snapshot prop #47" */
  @Column({ name: 'source', type: 'varchar', length: 100 })
  source: string;

  /** Category: Repayment | Governance | Cross-protocol | Identity | Penalty | Passive */
  @Column({ name: 'source_type', type: 'varchar', length: 30 })
  sourceType: string;

  /** Score delta — positive or negative */
  @Column({ name: 'delta', type: 'smallint' })
  delta: number;

  /** Score after applying this event */
  @Column({ name: 'score_after', type: 'smallint' })
  scoreAfter: number;

  @Column({ name: 'tx_hash', type: 'varchar', length: 66, nullable: true })
  txHash: string;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: string;

  /** EAS attestation UID if applicable */
  @Column({ name: 'attestation_uid', type: 'varchar', length: 66, nullable: true })
  attestationUid: string;

  /** Full EAS attestation payload (JSON) */
  @Column({ name: 'attestation_payload', type: 'jsonb', nullable: true })
  attestationPayload: Record<string, unknown>;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
