import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LoanStatus {
  ACTIVE = 'active',
  REPAID = 'repaid',
  DEFAULTED = 'defaulted',
  WRITTEN_OFF = 'written_off',
  GRACE_PERIOD = 'grace_period',
}

@Entity('loan_snapshots')
@Index(['borrower'])
@Index(['status'])
@Index(['loanId'], { unique: true })
export class LoanSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** On-chain loan ID */
  @Column({ name: 'loan_id', type: 'bigint' })
  loanId: string;

  @Column({ name: 'borrower', type: 'varchar', length: 42 })
  borrower: string;

  /** Principal in USDC base units (6 decimals) */
  @Column({ name: 'principal', type: 'numeric', precision: 30, scale: 0 })
  principal: string;

  /** Accrued interest at snapshot time */
  @Column({ name: 'accrued_interest', type: 'numeric', precision: 30, scale: 0, default: '0' })
  accruedInterest: string;

  /** Due timestamp (unix seconds) */
  @Column({ name: 'due_at', type: 'bigint' })
  dueAt: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: LoanStatus.ACTIVE })
  status: LoanStatus;

  /** Interest rate in BPS */
  @Column({ name: 'rate_bps', type: 'int' })
  rateBps: number;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
