import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('lp_positions')
@Index(['wallet'], { unique: true })
export class LpPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet', type: 'varchar', length: 42 })
  wallet: string;

  /** USDC deposited (human-readable) */
  @Column({ name: 'usdc_deposited', type: 'numeric', precision: 20, scale: 2, default: '0' })
  usdcDeposited: string;

  /** Vault shares held */
  @Column({ name: 'shares', type: 'numeric', precision: 30, scale: 8, default: '0' })
  shares: string;

  /** Current share price in USDC */
  @Column({ name: 'share_price', type: 'numeric', precision: 20, scale: 8, default: '1' })
  sharePrice: string;

  /** Current value (shares × sharePrice) */
  @Column({ name: 'current_value', type: 'numeric', precision: 20, scale: 2, default: '0' })
  currentValue: string;

  /** Total interest earned so far */
  @Column({ name: 'interest_earned', type: 'numeric', precision: 20, scale: 2, default: '0' })
  interestEarned: string;

  /** Pool share in BPS */
  @Column({ name: 'pool_share_bps', type: 'int', default: 0 })
  poolShareBps: number;

  /** APY in BPS */
  @Column({ name: 'apy_bps', type: 'int', default: 0 })
  apyBps: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
