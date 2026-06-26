import type { LoanDetail, InterestAccrual, LoanRepayment, ScoreImpactDetail } from '@/types/loan-detail';
import { apiClient } from '@/lib/api/client';
import { configApi } from '@/lib/api/config';
// import mock from '../mock/loan-detail.json';

interface ApiLoan {
  loanId: string; borrower: string; principal: string; accruedInterest: string;
  totalOwed: string; rateBps: string; startTime: number; dueTime: number;
  status: string; isOverdue: boolean;
}

function mapApiLoan(r: ApiLoan, gracePeriodDays: number): LoanDetail {
  const stateMap: Record<string, LoanDetail['state']> = {
    active: 'Active', grace_period: 'GracePeriod',
    repaid: 'Repaid', defaulted: 'Defaulted', written_off: 'Defaulted',
  };
  const openedDate = new Date(r.startTime * 1000);
  const deadline = new Date(r.dueTime * 1000);
  const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
  const principalUsd = Number(r.principal) / 1e6;
  const outstandingUsd = Number(r.totalOwed) / 1e6;
  return {
    loanNum: Number(r.loanId),
    state: stateMap[r.status] ?? 'Active',
    borrower: r.borrower,
    openedIso: openedDate.toISOString(),
    openedDisplay: openedDate.toUTCString(),
    network: 'Base',
    deadline: deadline.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    daysLeft: Math.max(0, daysLeft),
    principal: principalUsd.toFixed(0),
    outstanding: outstandingUsd.toFixed(2),
    interestRateBps: Number(r.rateBps),
    gracePeriodDays,
    creditLimit: '5000',
    creditUsed: principalUsd.toFixed(0),
    creditPct: Math.min(100, Math.round((principalUsd / 5000) * 100)),
    openTxHash: '',
    basescanUrl: '',
    requestedAt: openedDate.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    activeAt: `Today · ${deadline.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`,
    activeDate: deadline.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
  };
}

function mapToInterestAccrual(r: ApiLoan): InterestAccrual {
  const principalUsd = Number(r.principal) / 1e6;
  const accruedUsd = Number(r.accruedInterest) / 1e6;
  const elapsed = Math.floor(Date.now() / 1000) - r.startTime;
  const remaining = r.dueTime - Math.floor(Date.now() / 1000);
  const dailyRate = (principalUsd * (Number(r.rateBps) / 10000)) / 365;
  const projected = principalUsd + dailyRate * Math.max(0, remaining / 86400);
  return {
    principal: principalUsd.toFixed(0),
    accruedInterest: accruedUsd.toFixed(2),
    dailyRate: dailyRate.toFixed(2),
    aprBps: Number(r.rateBps),
    blocksElapsed: Math.floor(elapsed / 2),
    projectedAtDeadline: projected.toFixed(2),
    projectedDisplay: `$${(dailyRate * Math.max(0, remaining / 86400)).toFixed(2)} projected`,
  };
}

export async function getLoanDetail(loanNum: number): Promise<LoanDetail> {
  const [res, cfg] = await Promise.all([
    apiClient.get<ApiLoan>(`/positions/loan/${loanNum}`),
    configApi.getProtocolConfig(),
  ]);
  return mapApiLoan(res.data, cfg.gracePeriodDays);
  // } catch { return mock.loan as LoanDetail; }
}

export async function getLoanInterest(loanNum: number): Promise<InterestAccrual> {
  const res = await apiClient.get<ApiLoan>(`/positions/loan/${loanNum}`);
  return mapToInterestAccrual(res.data);
  // } catch { return mock.interest as InterestAccrual; }
}

export async function getLoanRepayments(_loanNum: number): Promise<LoanRepayment[]> {
  // No repayment history endpoint yet
  // return mock.repayments as LoanRepayment[];
  return [];
}

export async function getLoanScoreImpact(_loanNum: number): Promise<ScoreImpactDetail> {
  // No score impact endpoint yet
  // return mock.scoreImpact as ScoreImpactDetail;
  return { projectedPoints: 0, repaymentNumber: 0, currentScore: 0, currentTier: 'Bronze', currentTierScore: 0, nextTier: 'Silver', nextTierScore: 200, ptsToNextTier: 200 };
}
