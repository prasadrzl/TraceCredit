import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';

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
}
