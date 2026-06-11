import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';

export interface LiquidationStatsRaw {
  total: number;
  totalRecovered: string;
  totalWrittenOff: string;
  last24hCount: number;
}

@Injectable()
export class LiquidationRepository {
  constructor(
    @InjectRepository(LiquidationRecord)
    private readonly repo: Repository<LiquidationRecord>,
  ) {}

  async findAll(limit = 50, skip = 0): Promise<LiquidationRecord[]> {
    return this.repo.find({ order: { liquidatedAt: 'DESC' }, take: limit, skip });
  }

  async findByBorrower(borrower: string): Promise<LiquidationRecord[]> {
    return this.repo.find({
      where: { borrower: borrower.toLowerCase() },
      order: { liquidatedAt: 'DESC' },
    });
  }

  async findByLoanId(loanId: string): Promise<LiquidationRecord | null> {
    return this.repo.findOne({ where: { loanId } });
  }

  async create(data: Partial<LiquidationRecord>): Promise<LiquidationRecord> {
    const rec = this.repo.create({ ...data, borrower: data.borrower?.toLowerCase() });
    return this.repo.save(rec);
  }

  /** Single-query aggregate: COUNT + SUM via SQL — no in-memory reduce over 10k rows. */
  async getStats(): Promise<LiquidationStatsRaw> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [agg, last24hCount] = await Promise.all([
      this.repo
        .createQueryBuilder('lr')
        .select('COUNT(*)', 'total')
        .addSelect('COALESCE(SUM(lr.recoveredAmount), 0)', 'totalRecovered')
        .addSelect('COALESCE(SUM(lr.writtenOffAmount), 0)', 'totalWrittenOff')
        .getRawOne<{ total: string; totalRecovered: string; totalWrittenOff: string }>(),
      this.repo.count({ where: { liquidatedAt: MoreThanOrEqual(since24h) } }),
    ]);

    return {
      total: parseInt(agg?.total ?? '0', 10),
      totalRecovered: agg?.totalRecovered ?? '0',
      totalWrittenOff: agg?.totalWrittenOff ?? '0',
      last24hCount,
    };
  }
}
