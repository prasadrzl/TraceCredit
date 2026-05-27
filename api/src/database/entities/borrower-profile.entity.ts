import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('borrower_profiles')
@Index(['wallet'], { unique: true })
export class BorrowerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet', type: 'varchar', length: 42 })
  wallet: string;

  @Column({ name: 'score', type: 'smallint', default: 0 })
  score: number;

  @Column({ name: 'tier', type: 'varchar', length: 20, default: 'Bronze' })
  tier: string;

  /** Credit limit in USDC (human-readable, e.g. "5000") */
  @Column({ name: 'credit_limit', type: 'numeric', precision: 20, scale: 2, default: '0' })
  creditLimit: string;

  @Column({ name: 'credit_used', type: 'numeric', precision: 20, scale: 2, default: '0' })
  creditUsed: string;

  /** Interest rate in BPS */
  @Column({ name: 'interest_rate_bps', type: 'int', default: 1400 })
  interestRateBps: number;

  /** 24-hour borrow rate limit in USDC */
  @Column({ name: 'rate_limit_24h', type: 'numeric', precision: 20, scale: 2, default: '0' })
  rateLimit24h: string;

  @Column({ name: 'rate_limit_used', type: 'numeric', precision: 20, scale: 2, default: '0' })
  rateLimitUsed: string;

  @Column({ name: 'sbt_minted', type: 'boolean', default: false })
  sbtMinted: boolean;

  @Column({ name: 'sbt_token_id', type: 'bigint', nullable: true })
  sbtTokenId: string;

  @Column({ name: 'next_tier', type: 'varchar', length: 20, nullable: true })
  nextTier: string;

  @Column({ name: 'next_tier_score', type: 'smallint', nullable: true })
  nextTierScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
