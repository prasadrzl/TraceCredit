import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanSnapshot, LoanStatus } from '../database/entities/loan-snapshot.entity';

@Injectable()
export class PositionsRepository {
  constructor(
    @InjectRepository(LoanSnapshot)
    private readonly repo: Repository<LoanSnapshot>,
  ) {}

  async findByBorrower(borrower: string): Promise<LoanSnapshot[]> {
    return this.repo.find({
      where: { borrower: borrower.toLowerCase() },
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<LoanSnapshot[]> {
    return this.repo.find({ where: { status: LoanStatus.ACTIVE } });
  }

  async findOverdue(nowMs: number): Promise<LoanSnapshot[]> {
    return this.repo
      .createQueryBuilder('ls')
      .where('ls.status = :status', { status: LoanStatus.ACTIVE })
      .andWhere('CAST(ls.due_at AS bigint) < :now', { now: Math.floor(nowMs / 1000) })
      .getMany();
  }

  async upsert(data: Partial<LoanSnapshot>): Promise<LoanSnapshot> {
    const existing = await this.repo.findOne({ where: { loanId: data.loanId } });
    if (existing) {
      Object.assign(existing, data);
      return this.repo.save(existing);
    }
    const record = this.repo.create({ ...data, borrower: data.borrower?.toLowerCase() });
    return this.repo.save(record);
  }

  async updateStatus(loanId: string, status: LoanStatus): Promise<void> {
    await this.repo.update({ loanId }, { status });
  }
}
