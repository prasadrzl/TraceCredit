import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pool_stats')
export class PoolStat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Total liquidity in pool (USDC) */
  @Column({ name: 'total_liquidity', type: 'numeric', precision: 30, scale: 2 })
  totalLiquidity: string;

  /** Liquidity currently borrowed out */
  @Column({ name: 'borrowed', type: 'numeric', precision: 30, scale: 2, default: '0' })
  borrowed: string;

  /** Available (totalLiquidity - borrowed) */
  @Column({ name: 'available', type: 'numeric', precision: 30, scale: 2, default: '0' })
  available: string;

  /** Utilisation in BPS */
  @Column({ name: 'utilisation_bps', type: 'int', default: 0 })
  utilisationBps: number;

  /** Below-kink APR in BPS */
  @Column({ name: 'below_kink_apr_bps', type: 'int', default: 0 })
  belowKinkAprBps: number;

  /** Above-kink APR in BPS */
  @Column({ name: 'above_kink_apr_bps', type: 'int', default: 0 })
  aboveKinkAprBps: number;

  /** Kink utilisation point in BPS */
  @Column({ name: 'kink_bps', type: 'int', default: 8000 })
  kinkBps: number;

  /** LP APY in BPS */
  @Column({ name: 'lp_apy_bps', type: 'int', default: 0 })
  lpApyBps: number;

  /** Total value locked across all pools */
  @Column({ name: 'total_value_locked', type: 'numeric', precision: 30, scale: 2, default: '0' })
  totalValueLocked: string;

  /** Total borrowers count */
  @Column({ name: 'active_borrowers', type: 'int', default: 0 })
  activeBorrowers: number;

  @CreateDateColumn({ name: 'snapshotted_at' })
  snapshottedAt: Date;
}
