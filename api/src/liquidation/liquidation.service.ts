import { Injectable } from '@nestjs/common';
import { LiquidationRepository } from './liquidation.repository';
import { GraphService } from '../graph/graph.service';
import { LiquidationRecord } from '../database/entities/liquidation-record.entity';

export interface LiquidationStats {
  totalLiquidations: number;
  totalRecovered: string;
  totalWrittenOff: string;
}

@Injectable()
export class LiquidationService {
  constructor(
    private readonly repo: LiquidationRepository,
    private readonly graph: GraphService,
  ) {}

  async getRecentLiquidations(limit = 50): Promise<LiquidationRecord[]> {
    return this.repo.findAll(limit, 0);
  }

  async getLiquidationsByBorrower(borrower: string): Promise<LiquidationRecord[]> {
    return this.repo.findByBorrower(borrower);
  }

  async getLiquidationStats(): Promise<LiquidationStats> {
    const records = await this.repo.findAll(10_000, 0);
    const totalRecovered = records.reduce((acc, r) => acc + BigInt(r.recoveredAmount), 0n);
    const totalWrittenOff = records.reduce((acc, r) => acc + BigInt(r.writtenOffAmount), 0n);
    return {
      totalLiquidations: records.length,
      totalRecovered: totalRecovered.toString(),
      totalWrittenOff: totalWrittenOff.toString(),
    };
  }

  async recordLiquidation(data: {
    loanId: string;
    borrower: string;
    recoveredAmount: string;
    writtenOffAmount: string;
    txHash: string;
    blockNumber: string;
    liquidatedAt: Date;
  }): Promise<LiquidationRecord> {
    return this.repo.create(data);
  }
}
