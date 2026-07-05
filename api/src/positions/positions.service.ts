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

// LoanState enum from ILendingPool: Active=0, GracePeriod=1, Defaulted=2, Repaid=3, WrittenOff=4
const LOAN_STATE_MAP: Record<number, LoanStatus> = {
  0: LoanStatus.ACTIVE,
  1: LoanStatus.GRACE_PERIOD,
  2: LoanStatus.DEFAULTED,
  3: LoanStatus.REPAID,
  4: LoanStatus.WRITTEN_OFF,
};

interface LoanStruct {
  borrower:        string;
  principal:       bigint;
  interestRateBps: bigint;
  startTime:       bigint; // block.number at origination
  deadline:        bigint; // block.timestamp + LOAN_DURATION
  repaid:          bigint;
  accruedInterest: bigint;
  state:           number; // LoanState enum
}

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

    let loanRaw: LoanStruct | null = null;

    try {
      loanRaw = await this.chain.publicClient.readContract({
        address: pool,
        abi: LENDING_POOL_ABI,
        functionName: 'getLoan',
        args: [loanId],
      }) as LoanStruct;
    } catch (err: any) {
      this.logger.warn(`getLoan on-chain failed for ${loanId}: ${err.message}`, 'PositionsService');
    }

    if (!loanRaw) {
      const snap = await this.repo.findByLoanId(loanId.toString());
      const now = Math.floor(Date.now() / 1000);
      const dueAt = Number(snap?.dueAt ?? 0);
      const result: LoanDetail = {
        loanId: loanId.toString(),
        borrower: snap?.borrower ?? '',
        principal: snap?.principal ?? '0',
        accruedInterest: snap?.accruedInterest ?? '0',
        totalOwed: String(BigInt(snap?.principal ?? '0') + BigInt(snap?.accruedInterest ?? '0')),
        rateBps: String(snap?.rateBps ?? 0),
        startTime: 0,
        dueTime: dueAt,
        status: snap?.status ?? LoanStatus.ACTIVE,
        isOverdue: dueAt > 0 && dueAt < now && snap?.status === LoanStatus.ACTIVE,
      };
      await this.cache.set(cacheKey, result, POSITIONS_CACHE_TTL_MS);
      return result;
    }

    // startTime is block.number; calcAccrued expects elapsedBlocks
    let accruedInterest = loanRaw.accruedInterest; // use on-chain value directly
    if (loanRaw.state === 0 /* Active */ && loanRaw.principal > 0n) {
      try {
        const currentBlock = await this.chain.getBlockNumber();
        const elapsedBlocks = currentBlock > loanRaw.startTime ? currentBlock - loanRaw.startTime : 0n;
        if (elapsedBlocks > 0n) {
          accruedInterest = await this.chain.publicClient.readContract({
            address: iae,
            abi: INTEREST_ACCRUAL_ENGINE_ABI,
            functionName: 'calcAccrued',
            args: [loanRaw.principal, loanRaw.interestRateBps, elapsedBlocks],
          }) as bigint;
        }
      } catch (err: any) {
        this.logger.warn(`calcAccrued failed for loan ${loanId}: ${err.message}`, 'PositionsService');
      }
    }

    const status = LOAN_STATE_MAP[loanRaw.state] ?? LoanStatus.ACTIVE;
    const nowSec = Math.floor(Date.now() / 1000);

    const result: LoanDetail = {
      loanId: loanId.toString(),
      borrower: loanRaw.borrower,
      principal: loanRaw.principal.toString(),
      accruedInterest: accruedInterest.toString(),
      totalOwed: (loanRaw.principal + accruedInterest).toString(),
      rateBps: loanRaw.interestRateBps.toString(),
      startTime: Number(loanRaw.startTime),
      dueTime: Number(loanRaw.deadline),
      status,
      isOverdue: Number(loanRaw.deadline) < nowSec && loanRaw.state === 0,
    };

    await this.cache.set(cacheKey, result, POSITIONS_CACHE_TTL_MS);
    return result;
  }

  async getBorrowerPositions(wallet: string): Promise<LoanDetail[]> {
    const graphLoans = await this.graph.getLoansByBorrower(wallet);
    if (graphLoans.length > 0) {
      const now = Math.floor(Date.now() / 1000);
      return graphLoans.map((l) => {
        const dueAt = Number(l.dueTime);
        return {
          loanId: l.loanId,
          borrower: l.borrower,
          principal: l.principal,
          accruedInterest: '0',
          totalOwed: l.principal,
          rateBps: l.rateBps,
          startTime: 0,
          dueTime: dueAt,
          status: l.status,
          isOverdue: dueAt > 0 && dueAt < now && l.status === 'active',
        } as LoanDetail;
      });
    }
    const snaps = await this.repo.findByBorrower(wallet);
    return snaps.map((snap) => {
      const now = Math.floor(Date.now() / 1000);
      const dueAt = Number(snap.dueAt ?? 0);
      return {
        loanId: snap.loanId,
        borrower: snap.borrower,
        principal: snap.principal,
        accruedInterest: snap.accruedInterest,
        totalOwed: String(BigInt(snap.principal) + BigInt(snap.accruedInterest)),
        rateBps: String(snap.rateBps),
        startTime: 0,
        dueTime: dueAt,
        status: snap.status,
        isOverdue: dueAt > 0 && dueAt < now && snap.status === LoanStatus.ACTIVE,
      } as LoanDetail;
    });
  }

  async getLoanSnapshotsByBorrower(borrower: string, limit = 20, skip = 0): Promise<LoanSnapshot[]> {
    return this.repo.findByBorrower(borrower, limit, skip);
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
