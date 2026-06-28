import type { LoanDetail, InterestAccrual, LoanRepayment, ScoreImpactDetail } from '@/types/loan-detail';
import { apiClient } from '@/lib/api/client';
import { configApi } from '@/lib/api/config';
import { PROTOCOL_CONFIG_DEFAULTS } from '@/hooks/use-config';
// import mock from '../mock/loan-detail.json';

interface ApiLoan {
  loanId: string; borrower: string; principal: string; accruedInterest: string;
  totalOwed: string; rateBps: string; startTime: number; dueTime: number;
  status: string; isOverdue: boolean;
}

interface ApiProfile {
  score: number; tier: string; creditLimit: string; creditUsed: string;
  nextTier: string; nextTierScore: number;
}

function mapApiLoan(r: ApiLoan, gracePeriodDays: number, profile?: ApiProfile): LoanDetail {
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
    creditLimit: profile?.creditLimit ?? '5000',
    creditUsed: profile?.creditUsed ?? principalUsd.toFixed(0),
    creditPct: profile?.creditLimit
      ? Math.min(100, Math.round((Number(profile.creditUsed) / Number(profile.creditLimit)) * 100))
      : Math.min(100, Math.round((principalUsd / 5000) * 100)),
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
  const loan = res.data;
  let profile: ApiProfile | undefined;
  try {
    const profileRes = await apiClient.get<ApiProfile>(`/score/${loan.borrower}/profile`);
    profile = profileRes.data;
  } catch { /* profile lookup is best-effort */ }
  return mapApiLoan(loan, cfg.gracePeriodDays, profile);
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

export async function getLoanScoreImpact(loanNum: number): Promise<ScoreImpactDetail> {
  try {
    const loanRes = await apiClient.get<ApiLoan>(`/positions/loan/${loanNum}`);
    const [profileRes, cfgRes] = await Promise.all([
      apiClient.get<ApiProfile>(`/score/${loanRes.data.borrower}/profile`),
      configApi.getProtocolConfig(),
    ]);
    const p = profileRes.data;
    const cfg = cfgRes;
    const scoreGain = cfg.onTimeRepaymentScoreGain ?? PROTOCOL_CONFIG_DEFAULTS.onTimeRepaymentScoreGain;
    const tierEntry = p.nextTier && cfg.tiers?.[p.nextTier];
    const nextTierScore = tierEntry ? tierEntry.minScore : p.nextTierScore ?? 200;
    return {
      projectedPoints: scoreGain,
      repaymentNumber: 0,
      currentScore: p.score,
      currentTier: p.tier as any,
      currentTierScore: p.score,
      nextTier: p.nextTier as any,
      nextTierScore,
      ptsToNextTier: Math.max(0, nextTierScore - p.score),
    };
  } catch {
    return { projectedPoints: 0, repaymentNumber: 0, currentScore: 0, currentTier: 'Bronze', currentTierScore: 0, nextTier: 'Silver', nextTierScore: 200, ptsToNextTier: 200 };
  }
}
