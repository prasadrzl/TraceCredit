import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('liquidation_records')
@Index(['loanId'])
@Index(['borrower'])
@Index(['txHash'])
@Unique(['txHash', 'loanId'])
export class LiquidationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_id', type: 'bigint' })
  loanId: string;

  @Column({ name: 'borrower', type: 'varchar', length: 42 })
  borrower: string;

  /** Amount recovered in USDC base units */
  @Column({ name: 'recovered_amount', type: 'numeric', precision: 30, scale: 0 })
  recoveredAmount: string;

  /** Remaining debt written off */
  @Column({ name: 'written_off_amount', type: 'numeric', precision: 30, scale: 0, default: '0' })
  writtenOffAmount: string;

  @Column({ name: 'tx_hash', type: 'varchar', length: 66 })
  txHash: string;

  @Column({ name: 'block_number', type: 'bigint' })
  blockNumber: string;

  /** Timestamp of the liquidation block */
  @Column({ name: 'liquidated_at', type: 'timestamptz' })
  liquidatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
