import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChainService } from '../chain/chain.service';
import { ContractsService } from '../contracts/contracts.service';
import { LENDING_POOL_ABI, INTEREST_ACCRUAL_ENGINE_ABI } from '../contracts/abis';
import { PositionsRepository } from './positions.repository';
import { GraphService } from '../graph/graph.service';
import { AppLogger } from '../logger/logger.service';
import { LoanSnapshot, LoanStatus } from '../database/entities/loan-snapshot.entity';

const POSITIONS_CACHE_TTL_MS = 60_000;

export interface LoanDetail {
  loanId: string;
  borrower: string;
  principal: string;
  accruedInterest: string;
  totalOwed: string;
  rateBps: string;
  startTime: number;
  dueTime: number;
  status: string;
  isOverdue: boolean;
}

@Injectable()
export class PositionsService {
  constructor(
    private readonly chain: ChainService,
    private readonly contracts: ContractsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly repo: PositionsRepository,
    private readonly graph: GraphService,
    private readonly logger: AppLogger,
  ) {}

  async getLoanDetail(loanId: bigint): Promise<LoanDetail> {
    const cacheKey = `loan:${loanId.toString()}`;
    const cached = await this.cache.get<LoanDetail>(cacheKey);
    if (cached) return cached;

    const pool = this.contracts.addr.lendingPool;
    const iae = this.contracts.addr.interestAccrualEngine;

    const loanRaw = await this.chain.publicClient.readContract({
      address: pool,
      abi: LENDING_POOL_ABI,
      functionName: 'getLoan',
      args: [loanId],
    }) as { borrower: string; principal: bigint; rateBps: bigint; startTime: bigint; dueTime: bigint; status: number };

    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const elapsed = nowSec > loanRaw.startTime ? nowSec - loanRaw.startTime : 0n;

    let accruedInterest = 0n;
    if (elapsed > 0n && loanRaw.principal > 0n) {
      try {
        accruedInterest = await this.chain.publicClient.readContract({
          address: iae,
          abi: INTEREST_ACCRUAL_ENGINE_ABI,
          functionName: 'calcAccrued',
          args: [loanRaw.principal, loanRaw.rateBps, elapsed],
        }) as bigint;
      } catch (err: any) {
        this.logger.warn(`calcAccrued failed for loan ${loanId}: ${err.message}`, 'PositionsService');
      }
    }

    const statusMap: Record<number, string> = {
      0: LoanStatus.ACTIVE,
      1: LoanStatus.REPAID,
      2: LoanStatus.GRACE_PERIOD,
      3: LoanStatus.DEFAULTED,
      4: LoanStatus.WRITTEN_OFF,
    };

    const result: LoanDetail = {
      loanId: loanId.toString(),
      borrower: loanRaw.borrower,
      principal: loanRaw.principal.toString(),
      accruedInterest: accruedInterest.toString(),
      totalOwed: (loanRaw.principal + accruedInterest).toString(),
      rateBps: loanRaw.rateBps.toString(),
      startTime: Number(loanRaw.startTime),
      dueTime: Number(loanRaw.dueTime),
      status: statusMap[loanRaw.status] ?? 'unknown',
      isOverdue: Number(loanRaw.dueTime) < Math.floor(Date.now() / 1000) && loanRaw.status === 0,
    };

    await this.cache.set(cacheKey, result, POSITIONS_CACHE_TTL_MS);
    return result;
  }

  async getBorrowerPositions(wallet: string): Promise<LoanDetail[]> {
    const loans = await this.graph.getLoansByBorrower(wallet);
    const details = await Promise.all(
      loans.map((l) => this.getLoanDetail(BigInt(l.loanId)).catch(() => null)),
    );
    return details.filter(Boolean) as LoanDetail[];
  }

  async getLoanSnapshotsByBorrower(borrower: string): Promise<LoanSnapshot[]> {
    return this.repo.findByBorrower(borrower);
  }

  async syncLoanSnapshot(loanId: bigint): Promise<void> {
    try {
      const detail = await this.getLoanDetail(loanId);
      await this.repo.upsert({
        loanId: loanId.toString(),
        borrower: detail.borrower.toLowerCase(),
        principal: detail.principal,
        accruedInterest: detail.accruedInterest,
        dueAt: detail.dueTime.toString(),
        status: detail.status as LoanStatus,
        rateBps: Number(detail.rateBps),
      });
    } catch (err: any) {
      this.logger.warn(`syncLoanSnapshot failed for ${loanId}: ${err.message}`, 'PositionsService');
    }
  }
}
