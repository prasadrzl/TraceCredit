import type {
  SbtInfo, ReputationScore, CreditSnapshot,
  ScoreHistoryPoint, ScoreStats, RecentEvent,
  SignalBreakdownItem, NetScore, AttestationSource, SignalDecayItem,
} from '@/types/reputation';
import type { Tier } from '@/types/api';
import { apiClient } from '@/lib/api/client';
import { configApi } from '@/lib/api/config';
// import mock from '@/lib/mock/reputation.json';

interface ApiProfile {
  score: number; tier: string; nextTier: string; nextTierScore: number;
  sbtMinted: boolean; sbtTokenId: string; interestRateBps: number;
  creditLimit: string; creditUsed: string; sbtMintedAt?: string; sbtStake?: string;
}
interface ApiScoreHistory { score: number; previousScore: number; tier: string; recordedAt: string; }
interface ApiEvent {
  id: string; signalType: string; signalSub: string; source: string; sourceType: string;
  delta: number; scoreAfter: number; txHash: string; occurredAt: string;
  attestationUid?: string; attestationPayload?: Record<string, unknown>;
}
interface ApiLoan { loanId: string; status: string; principal: string; createdAt: string; }

const SIGNAL_TYPE_MAP: Record<string, RecentEvent['type']> = {
  ON_TIME_REPAYMENT: 'repayment', PARTIAL_REPAYMENT: 'repayment',
  LATE_REPAYMENT: 'late', DAO_VOTE: 'dao',
  CROSS_PROTOCOL_REPAYMENT: 'cross', WALLET_AGE: 'wallet',
  KYC_VERIFIED: 'holdings', DECAY: 'decay', ATTESTATION_RECEIVED: 'stake',
};

export async function getSbtInfo(wallet: string): Promise<SbtInfo> {
  // try {
    const [profileRes, cfg] = await Promise.all([
      apiClient.get<ApiProfile>(`/score/${wallet}/profile`),
      configApi.getProtocolConfig(),
    ]);
    const p = profileRes.data;
    const mintedDate = p.sbtMintedAt
      ? new Date(p.sbtMintedAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : 'N/A';
    return {
      wallet,
      tokenId: Number(p.sbtTokenId ?? 0),
      mintedDate,
      stakeLocked: p.sbtStake ?? String(cfg.sbtStakeUsdc * 1e6),
      status: p.sbtMinted ? 'Active' : 'Not minted',
      frozen: false,
    };
  // } catch { return mock.sbt as SbtInfo; }
}

export async function getReputationScore(wallet: string): Promise<ReputationScore> {
  // try {
    const [profileRes, cfg] = await Promise.all([
      apiClient.get<ApiProfile>(`/score/${wallet}/profile`),
      configApi.getProtocolConfig(),
    ]);
    const p = profileRes.data;
    const diamondTier = cfg.tiers['Diamond'];
    const diamondCreditLimit = diamondTier ? diamondTier.creditLimitUsdc.toLocaleString() : '100,000';
    const diamondRate = diamondTier ? diamondTier.interestRateBps / 100 : 7;
    const ptsToNextTier = Math.max(0, (p.nextTierScore ?? 0) - p.score);
    return {
      score: p.score,
      tier: p.tier as Tier,
      nextTier: (p.nextTier ?? '') as Tier,
      nextTierScore: p.nextTierScore ?? 0,
      diamondScore: cfg.diamondScore,
      ptsToNextTier,
      ptsToDiamond: Math.max(0, cfg.diamondScore - p.score),
      unlocksAtDiamond: `${diamondCreditLimit} USDC limit · ${diamondRate}% APR`,
      rateAtDiamond: diamondTier?.interestRateBps ?? 700,
      limitLockupDays: cfg.limitIncreaseDays,
    };
  // } catch { return mock.reputationScore as ReputationScore; }
}

export async function getCreditSnapshot(wallet: string): Promise<CreditSnapshot> {
  // try {
    const [profileRes, loansRes, cfg] = await Promise.all([
      apiClient.get<ApiProfile>(`/score/${wallet}/profile`),
      apiClient.get<ApiLoan[]>(`/positions/snapshots/${wallet}`),
      configApi.getProtocolConfig(),
    ]);
    const p = profileRes.data;
    const loans = loansRes.data;
    const lastActivity = loans.reduce((min, l) => {
      const t = Date.now() - new Date(l.createdAt).getTime();
      return Math.min(min, t);
    }, Date.now());
    const lastActivityDaysAgo = Math.floor(lastActivity / 86_400_000);
    return {
      tier: p.tier as Tier,
      creditLimit: (Number(p.creditLimit) * 1e6).toFixed(0),
      creditUsed: (Number(p.creditUsed) * 1e6).toFixed(0),
      creditAvailable: ((Number(p.creditLimit) - Number(p.creditUsed)) * 1e6).toFixed(0),
      interestRateBps: p.interestRateBps,
      limitIncreaseDays: cfg.limitIncreaseDays,
      activeLoans: loans.filter(l => l.status === 'active' || l.status === 'grace_period').length,
      loansRepaid: loans.filter(l => l.status === 'repaid').length,
      defaults: loans.filter(l => l.status === 'defaulted' || l.status === 'written_off').length,
      lastActivityDaysAgo,
      sbtProtection: {
        guardianSet: 'TraceCredit DAO',
        stakeVault: `${cfg.sbtStakeUsdc} USDC locked`,
        unlockDelay: `${cfg.sbtUnlockDays} days`,
      },
    };
  // } catch { return mock.creditSnapshot as CreditSnapshot; }
}

export async function getScoreHistory(wallet: string): Promise<ScoreHistoryPoint[]> {
  // try {
    const res = await apiClient.get<ApiScoreHistory[]>(`/score/${wallet}/db-history?limit=30`);
    return [...res.data]
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map(h => ({
        label: new Date(h.recordedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        score: h.score,
      }));
  // } catch { return mock.scoreHistory as ScoreHistoryPoint[]; }
}

export async function getScoreStats(wallet: string): Promise<ScoreStats> {
  // try {
    const [historyRes, eventsRes] = await Promise.all([
      apiClient.get<ApiScoreHistory[]>(`/score/${wallet}/db-history?limit=200`),
      apiClient.get<ApiEvent[]>(`/score/${wallet}/events?limit=200`),
    ]);
    const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
    const recent = eventsRes.data.filter(e => new Date(e.occurredAt).getTime() > thirtyDaysAgo);
    const change30d = recent.reduce((s, e) => s + e.delta, 0);
    const peakScore = historyRes.data.reduce((max, h) => Math.max(max, h.score), 0);
    return { change30d, peakScore, signalCount: eventsRes.data.length };
  // } catch { return mock.scoreStats as ScoreStats; }
}

export async function getRecentEvents(wallet: string): Promise<RecentEvent[]> {
  // try {
    const res = await apiClient.get<ApiEvent[]>(`/score/${wallet}/events?limit=20`);
    return res.data.map(e => ({
      id: e.id,
      type: SIGNAL_TYPE_MAP[e.signalType] ?? 'repayment',
      label: e.signalSub,
      sub: e.source,
      score: e.scoreAfter,
      points: e.delta,
      daysAgo: Math.floor((Date.now() - new Date(e.occurredAt).getTime()) / 86_400_000),
    }));
  // } catch { return mock.recentEvents as RecentEvent[]; }
}

export async function getSignalBreakdown(wallet: string): Promise<SignalBreakdownItem[]> {
  // try {
    const res = await apiClient.get<ApiEvent[]>(`/score/${wallet}/events?limit=200`);
    const groups: Record<string, { type: RecentEvent['type']; label: string; count: number; points: number }> = {};
    for (const e of res.data) {
      const type = SIGNAL_TYPE_MAP[e.signalType] ?? 'repayment';
      if (!groups[type]) groups[type] = { type, label: e.signalSub, count: 0, points: 0 };
      groups[type].count++;
      groups[type].points += e.delta;
    }
    return Object.entries(groups).map(([id, g]) => ({
      id, type: g.type, label: g.label, count: g.count, points: g.points,
    }));
  // } catch { return mock.signalBreakdown as SignalBreakdownItem[]; }
}

export async function getNetScore(wallet: string): Promise<NetScore> {
  // try {
    const [profileRes, cfg] = await Promise.all([
      apiClient.get<ApiProfile>(`/score/${wallet}/profile`),
      configApi.getProtocolConfig(),
    ]);
    const p = profileRes.data;
    const tierBonuses: Record<string, number> = {
      Bronze: 0, Silver: 10, Gold: 20, Platinum: 35, Diamond: 50,
    };
    const tierBonus = tierBonuses[p.tier] ?? 0;
    return { base: p.score - tierBonus, tierBonus, displayed: p.score, netPoints: p.score };
  // } catch { return mock.netScore as NetScore; }
}

export async function getAttestationSources(wallet: string): Promise<AttestationSource[]> {
  // try {
    const res = await apiClient.get<ApiEvent[]>(`/score/${wallet}/events?limit=200`);
    const seen = new Set<string>();
    return res.data
      .filter(e => e.attestationUid)
      .reduce<AttestationSource[]>((acc, e) => {
        if (seen.has(e.source)) return acc;
        seen.add(e.source);
        acc.push({
          id: e.id,
          name: e.source,
          sub: e.signalSub,
          status: 'Active',
          attested: new Date(e.occurredAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          quorum: Number((e.attestationPayload as any)?.quorum ?? 1),
          dots: 3,
        });
        return acc;
      }, []);
  // } catch { return mock.attestationSources as AttestationSource[]; }
}

export async function getSignalDecay(wallet: string): Promise<SignalDecayItem[]> {
  // try {
    const [res, cfg] = await Promise.all([
      apiClient.get<ApiEvent[]>(`/score/${wallet}/events?limit=200`),
      configApi.getProtocolConfig(),
    ]);
    return res.data
      .filter(e => e.signalType === 'DECAY' || e.signalType === 'LATE_REPAYMENT')
      .map(e => {
        const applied = new Date(e.occurredAt);
        const expiresMs = applied.getTime() + cfg.signalDecayDays * 86_400_000;
        const expires = new Date(expiresMs);
        return {
          id: e.id,
          signal: e.signalSub,
          applied: applied.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          expires: expires.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          duration: `${cfg.signalDecayDays} days`,
          points: e.delta,
          expiring: Math.ceil((expiresMs - Date.now()) / 86_400_000) <= cfg.signalExpiryWarningDays,
        };
      });
  // } catch { return mock.signalDecay as SignalDecayItem[]; }
}
