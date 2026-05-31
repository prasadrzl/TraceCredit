import type {
  NetPosition, PositionStats, BorrowPositions,
  ReputationSnapshot, RecentActivity, NetPositionChartPoint,
  ActiveBorrowPosition, HistoricalBorrowPosition,
} from '@/types/portfolio';
import type { Tier } from '@/types/api';
import { apiClient } from '@/lib/api/client';
import mock from '@/lib/mock/portfolio.json';

interface ApiPortfolio {
  wallet: string;
  score: number; tier: string; creditLimit: string; creditUsed: string;
  creditAvailable: string; interestRateBps: number; nextTier: string; nextTierScore: number; sbtMinted: boolean;
  lpDeposited: string; lpCurrentValue: string; lpShares: string; lpSharePrice: string;
  lpApyBps: number; lpPoolShareBps: number; lpInterestEarned: string;
  activeLoans: ApiLoan[]; historicalLoans: ApiLoan[];
  totalBorrowed: string; totalRepaid: string;
  recentEvents: ApiEvent[]; scoreTrend: ApiScorePoint[];
}
interface ApiLoan {
  loanId: string; status: string; principal: string; accruedInterest: string;
  dueAt: string; rateBps: number; createdAt: string;
}
interface ApiEvent {
  id: string; signalType: string; signalSub: string; source: string;
  sourceType: string; delta: number; scoreAfter: number; txHash: string; occurredAt: string;
}
interface ApiScorePoint { date: string; score: number; }

const STATE_MAP: Record<string, 'Active' | 'GracePeriod' | 'Repaid' | 'Defaulted'> = {
  active: 'Active', grace_period: 'GracePeriod', repaid: 'Repaid',
  defaulted: 'Defaulted', written_off: 'Defaulted',
};
const ACTIVITY_TYPE_MAP: Record<string, RecentActivity['type']> = {
  ON_TIME_REPAYMENT: 'repay', PARTIAL_REPAYMENT: 'repay', LATE_REPAYMENT: 'penalty',
  DAO_VOTE: 'score', CROSS_PROTOCOL_REPAYMENT: 'score', DECAY: 'penalty',
  ATTESTATION_RECEIVED: 'score', KYC_VERIFIED: 'score', WALLET_AGE: 'score',
};

function mapActiveLoan(l: ApiLoan): ActiveBorrowPosition {
  const due = new Date(Number(l.dueAt) * 1000);
  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  return {
    loanId: l.loanId,
    state: STATE_MAP[l.status] ?? 'Active',
    openedDate: new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    deadline: due.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    daysLeft: Math.max(0, daysLeft),
    tier: 'Gold' as Tier,
    repaidBps: 0,
    principal: (Number(l.principal) / 1e6).toFixed(2),
    interest: (Number(l.accruedInterest) / 1e6).toFixed(2),
    note: l.status === 'grace_period' ? 'Grace period active' : '',
  };
}

function mapHistoricalLoan(l: ApiLoan): HistoricalBorrowPosition {
  const opened = new Date(l.createdAt);
  const closed = new Date(Number(l.dueAt) * 1000);
  return {
    loanId: l.loanId,
    state: STATE_MAP[l.status] ?? 'Repaid',
    dateRange: `${opened.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} – ${closed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`,
    repaidBps: l.status === 'repaid' ? 10000 : 0,
    principal: (Number(l.principal) / 1e6).toFixed(2),
    note: l.status === 'repaid' ? 'Fully repaid' : 'Defaulted',
  };
}

export async function getNetPosition(wallet: string): Promise<NetPosition> {
  try {
    const res = await apiClient.get<ApiPortfolio>(`/portfolio/${wallet}`);
    const p = res.data;
    const lpValue = Number(p.lpCurrentValue);
    const debt = p.activeLoans.reduce((s, l) => s + Number(l.principal) / 1e6, 0);
    const yieldEarned = Number(p.lpInterestEarned);
    return {
      netValue: (lpValue - debt + yieldEarned).toFixed(2),
      yieldEarned: yieldEarned.toFixed(2),
      lpValue: lpValue.toFixed(2),
      outstandingDebt: debt.toFixed(2),
    };
  } catch { return mock.netPosition as NetPosition; }
}

export async function getPositionStats(wallet: string): Promise<PositionStats> {
  try {
    const res = await apiClient.get<ApiPortfolio>(`/portfolio/${wallet}`);
    const p = res.data;
    const urgentLoans = p.activeLoans.filter(l =>
      Math.ceil((Number(l.dueAt) * 1000 - Date.now()) / 86_400_000) <= 3
    ).length;
    const creditUsed = Number(p.creditUsed);
    const creditLimit = Number(p.creditLimit);
    return {
      repScore: p.score,
      repTier: p.tier as Tier,
      creditUsedBps: creditLimit > 0 ? Math.round((creditUsed / creditLimit) * 10000) : 0,
      creditLimit: p.creditLimit,
      creditUsed: p.creditUsed,
      health: p.activeLoans.length === 0 ? 'Healthy' : urgentLoans > 0 ? 'At Risk' : 'Good',
      healthSub: urgentLoans > 0 ? `${urgentLoans} loan(s) due soon` : 'All loans on track',
      urgentLoans,
      urgentSub: urgentLoans > 0 ? 'Due within 3 days' : 'No urgent repayments',
      nextLimitDays: 30,
      nextLimitSub: 'Credit limit review',
      lpShares: p.lpShares,
      lpApyBps: p.lpApyBps,
      pendingYield: p.lpInterestEarned,
      sbtStakeLocked: '0',
      sbtUnlockDelay: '30 days',
    };
  } catch { return mock.positionStats as PositionStats; }
}

export async function getBorrowPositions(wallet: string): Promise<BorrowPositions> {
  try {
    const res = await apiClient.get<ApiPortfolio>(`/portfolio/${wallet}`);
    const p = res.data;
    return {
      openCount: p.activeLoans.length,
      historicalCount: p.historicalLoans.length,
      active: p.activeLoans.map(mapActiveLoan),
      historical: p.historicalLoans.map(mapHistoricalLoan),
    };
  } catch { return mock.borrowPositions as unknown as BorrowPositions; }
}

export async function getReputationSnapshot(wallet: string): Promise<ReputationSnapshot> {
  try {
    const res = await apiClient.get<ApiPortfolio>(`/portfolio/${wallet}`);
    const p = res.data;
    const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
    const recent = p.recentEvents.filter(e => new Date(e.occurredAt).getTime() > thirtyDaysAgo);
    const change30d = recent.reduce((s, e) => s + e.delta, 0);
    const signalMap: Record<string, { label: string; color: string }> = {
      ON_TIME_REPAYMENT: { label: 'On-time repayment', color: '#22c55e' },
      DAO_VOTE:          { label: 'DAO governance',    color: '#6366f1' },
      CROSS_PROTOCOL_REPAYMENT: { label: 'Cross-protocol', color: '#3b82f6' },
      LATE_REPAYMENT:    { label: 'Late repayment',    color: '#ef4444' },
      DECAY:             { label: 'Score decay',       color: '#94a3b8' },
    };
    const signals = Object.entries(
      recent.reduce((acc, e) => {
        acc[e.signalType] = (acc[e.signalType] ?? 0) + e.delta;
        return acc;
      }, {} as Record<string, number>)
    ).map(([key, pts]) => ({
      label: signalMap[key]?.label ?? key,
      points: pts,
      color: signalMap[key]?.color ?? '#64748b',
    }));
    return { score: p.score, tier: p.tier as Tier, change30d, signals };
  } catch { return mock.reputationSnapshot as ReputationSnapshot; }
}

export async function getRecentActivity(wallet: string): Promise<RecentActivity[]> {
  try {
    const res = await apiClient.get<ApiPortfolio>(`/portfolio/${wallet}`);
    return res.data.recentEvents.map(e => ({
      id: e.id,
      type: ACTIVITY_TYPE_MAP[e.signalType] ?? 'score',
      label: e.signalSub,
      sub: e.source,
      scoreChange: e.delta,
      daysAgo: Math.floor((Date.now() - new Date(e.occurredAt).getTime()) / 86_400_000),
    }));
  } catch { return mock.recentActivity as RecentActivity[]; }
}

export async function getNetPositionChart(wallet: string): Promise<NetPositionChartPoint[]> {
  try {
    const res = await apiClient.get<ApiPortfolio>(`/portfolio/${wallet}`);
    const p = res.data;
    const lpValue = Number(p.lpCurrentValue);
    const debt = p.activeLoans.reduce((s, l) => s + Number(l.principal) / 1e6, 0);
    return p.scoreTrend.map((pt, i) => ({
      label: pt.date,
      lp: lpValue,
      debt: i === p.scoreTrend.length - 1 ? debt : debt * 0.9,
      net: lpValue - debt,
    }));
  } catch { return mock.netPositionChart as NetPositionChartPoint[]; }
}
