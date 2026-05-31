import type { BorrowerProfile, ActiveLoan, ScoreSignal } from '@/types/borrow';
import type { Tier } from '@/types/api';
import { apiClient } from '@/lib/api/client';
import mock from '@/lib/mock/borrow.json';

interface ApiProfile {
  score: number; tier: string; creditLimit: string; creditUsed: string;
  nextTier: string; nextTierScore: number; sbtMinted: boolean; interestRateBps: number;
  rateLimit24h: string; rateLimitUsed: string;
}
interface ApiLoan {
  loanId: string; status: string; principal: string; accruedInterest: string;
  dueAt: string; rateBps: number; createdAt: string;
}
interface ApiEvent {
  id: string; signalType: string; signalSub: string; delta: number; occurredAt: string;
}
const TIER_CREDIT: Record<string, string> = {
  Bronze: '0', Silver: '500', Gold: '5000', Platinum: '25000', Diamond: '100000',
};
const TIER_RATE: Record<string, number> = {
  Bronze: 1800, Silver: 1800, Gold: 1400, Platinum: 1000, Diamond: 700,
};

export async function getBorrowerProfile(wallet: string): Promise<BorrowerProfile> {
  try {
    const res = await apiClient.get<ApiProfile>(`/score/${wallet}/profile`);
    const p = res.data;
    const limit = Number(p.creditLimit);
    const used = Number(p.creditUsed);
    return {
      wallet, score: p.score, tier: p.tier as Tier,
      creditLimit: (limit * 1e6).toFixed(0), creditUsed: (used * 1e6).toFixed(0),
      creditAvailable: ((limit - used) * 1e6).toFixed(0),
      interestRateBps: p.interestRateBps,
      rateLimit24h: (Number(p.rateLimit24h) * 1e6).toFixed(0), rateLimitUsed: '0',
      rateLimitResetSec: Math.floor(Date.now() / 1000) + 86400,
      nextTierScore: p.nextTierScore ?? 0, nextTier: (p.nextTier ?? '') as Tier,
      nextTierCreditLimit: TIER_CREDIT[p.nextTier ?? ''] ?? '0',
      nextTierRateBps: TIER_RATE[p.nextTier ?? ''] ?? 1800,
      scoreToNextTier: Math.max(0, (p.nextTierScore ?? 0) - p.score),
    };
  } catch {
    return mock.borrowerProfile as BorrowerProfile;
  }
}

export async function getActiveLoans(wallet: string): Promise<ActiveLoan[]> {
  try {
    const res = await apiClient.get<ApiLoan[]>(`/positions/snapshots/${wallet}`);
    const active = res.data.filter(l => l.status === 'active' || l.status === 'grace_period');
    return active.map(l => {
      const due = new Date(Number(l.dueAt) * 1000);
      const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
      const principalUsd = Number(l.principal) / 1e6;
      const interestUsd = Number(l.accruedInterest) / 1e6;
      return {
        loanId: l.loanId, state: l.status === 'grace_period' ? 'GracePeriod' : 'Active',
        openedDate: new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        network: 'Base', principal: principalUsd.toFixed(2), interest: interestUsd.toFixed(2),
        aprBps: l.rateBps, repaid: '0', totalDue: (principalUsd + interestUsd).toFixed(2),
        deadline: due.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        daysLeft: Math.max(0, daysLeft), gracePeriodDays: 7,
        graceExpires: l.status === 'grace_period' ? due.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : undefined,
      };
    });
  } catch {
    return mock.activeLoans as ActiveLoan[];
  }
}

export async function getScoreSignals(wallet: string): Promise<ScoreSignal[]> {
  try {
    const typeMap: Record<string, ScoreSignal['type']> = {
      ON_TIME_REPAYMENT: 'repayment', PARTIAL_REPAYMENT: 'repayment', LATE_REPAYMENT: 'late',
      DAO_VOTE: 'dao', CROSS_PROTOCOL_REPAYMENT: 'cross', WALLET_AGE: 'wallet',
      KYC_VERIFIED: 'holdings', DECAY: 'decay', ATTESTATION_RECEIVED: 'stake',
    };
    const res = await apiClient.get<ApiEvent[]>(`/score/${wallet}/events?limit=20`);
    return res.data.map(e => ({
      id: e.id, type: typeMap[e.signalType] ?? 'repayment', label: e.signalSub,
      sub: e.signalType, daysAgo: Math.floor((Date.now() - new Date(e.occurredAt).getTime()) / 86_400_000),
      points: e.delta,
    }));
  } catch {
    return mock.scoreSignals as ScoreSignal[];
  }
}
