import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BorrowerProfile } from '../database/entities/borrower-profile.entity';
import { LoanSnapshot, LoanStatus } from '../database/entities/loan-snapshot.entity';
import { LpPosition } from '../database/entities/lp-position.entity';
import { ScoreEvent } from '../database/entities/score-event.entity';
import { ScoreHistory } from '../database/entities/score-history.entity';

export interface PortfolioSummary {
  wallet: string;
  // Score & credit
  score: number;
  tier: string;
  creditLimit: string;
  creditUsed: string;
  creditAvailable: string;
  interestRateBps: number;
  nextTier: string;
  nextTierScore: number;
  sbtMinted: boolean;
  // LP position
  lpDeposited: string;
  lpCurrentValue: string;
  lpShares: string;
  lpSharePrice: string;
  lpApyBps: number;
  lpPoolShareBps: number;
  lpInterestEarned: string;
  // Loans
  activeLoans: PortfolioLoan[];
  historicalLoans: PortfolioLoan[];
  totalBorrowed: string;
  totalRepaid: string;
  // Recent activity (last 10 score events)
  recentEvents: PortfolioEvent[];
  // Net position chart (last 30 days of score history)
  scoreTrend: PortfolioScorePoint[];
}

export interface PortfolioLoan {
  loanId: string;
  status: string;
  principal: string;
  accruedInterest: string;
  dueAt: string;
  rateBps: number;
  createdAt: string;
}

export interface PortfolioEvent {
  id: string;
  signalType: string;
  signalSub: string;
  source: string;
  sourceType: string;
  delta: number;
  scoreAfter: number;
  txHash: string;
  occurredAt: string;
}

export interface PortfolioScorePoint {
  date: string;
  score: number;
}

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(BorrowerProfile)
    private readonly profileRepo: Repository<BorrowerProfile>,
    @InjectRepository(LoanSnapshot)
    private readonly loanRepo: Repository<LoanSnapshot>,
    @InjectRepository(LpPosition)
    private readonly lpRepo: Repository<LpPosition>,
    @InjectRepository(ScoreEvent)
    private readonly eventRepo: Repository<ScoreEvent>,
    @InjectRepository(ScoreHistory)
    private readonly historyRepo: Repository<ScoreHistory>,
  ) {}

  async getPortfolio(wallet: string): Promise<PortfolioSummary> {
    const w = wallet.toLowerCase();

    const [profile, loans, lp, events, history] = await Promise.all([
      this.profileRepo.findOne({ where: { wallet: w } }),
      this.loanRepo.find({ where: { borrower: w }, order: { createdAt: 'DESC' } }),
      this.lpRepo.findOne({ where: { wallet: w } }),
      this.eventRepo.find({ where: { wallet: w }, order: { occurredAt: 'DESC' }, take: 10 }),
      this.historyRepo.find({ where: { wallet: w }, order: { recordedAt: 'DESC' }, take: 30 }),
    ]);

    const activeStatuses = [LoanStatus.ACTIVE, LoanStatus.GRACE_PERIOD];
    const activeLoans = loans.filter(l => activeStatuses.includes(l.status));
    const historicalLoans = loans.filter(l => !activeStatuses.includes(l.status));

    const totalBorrowed = loans.reduce((s, l) => s + Number(l.principal), 0);
    const totalRepaid = historicalLoans
      .filter(l => l.status === LoanStatus.REPAID)
      .reduce((s, l) => s + Number(l.principal), 0);

    const mapLoan = (l: LoanSnapshot): PortfolioLoan => ({
      loanId: l.loanId,
      status: l.status,
      principal: l.principal,
      accruedInterest: l.accruedInterest,
      dueAt: l.dueAt,
      rateBps: l.rateBps,
      createdAt: l.createdAt.toISOString(),
    });

    const mapEvent = (e: ScoreEvent): PortfolioEvent => ({
      id: e.id,
      signalType: e.signalType,
      signalSub: e.signalSub,
      source: e.source,
      sourceType: e.sourceType,
      delta: e.delta,
      scoreAfter: e.scoreAfter,
      txHash: e.txHash ?? '',
      occurredAt: e.occurredAt.toISOString(),
    });

    const scoreTrend = [...history]
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
      .map(h => ({
        date: h.recordedAt.toISOString().slice(0, 10),
        score: h.score,
      }));

    const creditAvailable = profile
      ? Math.max(0, Number(profile.creditLimit) - Number(profile.creditUsed)).toFixed(2)
      : '0';

    return {
      wallet,
      score: profile?.score ?? 0,
      tier: profile?.tier ?? 'Bronze',
      creditLimit: profile?.creditLimit ?? '0',
      creditUsed: profile?.creditUsed ?? '0',
      creditAvailable,
      interestRateBps: profile?.interestRateBps ?? 1800,
      nextTier: profile?.nextTier ?? '',
      nextTierScore: profile?.nextTierScore ?? 0,
      sbtMinted: profile?.sbtMinted ?? false,
      lpDeposited: lp?.usdcDeposited ?? '0',
      lpCurrentValue: lp?.currentValue ?? '0',
      lpShares: lp?.shares ?? '0',
      lpSharePrice: lp?.sharePrice ?? '1',
      lpApyBps: lp?.apyBps ?? 0,
      lpPoolShareBps: lp?.poolShareBps ?? 0,
      lpInterestEarned: lp?.interestEarned ?? '0',
      activeLoans: activeLoans.map(mapLoan),
      historicalLoans: historicalLoans.map(mapLoan),
      totalBorrowed: (totalBorrowed / 1e6).toFixed(2),
      totalRepaid: (totalRepaid / 1e6).toFixed(2),
      recentEvents: events.map(mapEvent),
      scoreTrend,
    };
  }
}
