import type { ScoreHeader, ScoreTrendPoint, SignalBreakdownItem, ScoreEvent } from '@/types/score-history';
import type { Tier } from '@/types/api';
import { apiClient } from '@/lib/api/client';
// import mock from '../mock/score-history.json';

interface ApiProfile { score: number; tier: string; nextTier: string; nextTierScore: number; sbtMinted: boolean; }
interface ApiScoreHistory { score: number; previousScore: number; tier: string; source: string; recordedAt: string; }
interface ApiScoreEvent { id: string; signalType: string; signalSub: string; source: string; sourceType: string; delta: number; scoreAfter: number; txHash: string; blockNumber: string; occurredAt: string; attestationUid?: string; attestationPayload?: Record<string, unknown>; }

function mapEventRow(e: ApiScoreEvent): ScoreEvent {
  const date = new Date(e.occurredAt);
  const attestation = e.attestationUid ? {
    schema: (e.attestationPayload?.schema as string) ?? '', uid: e.attestationUid,
    attester: (e.attestationPayload?.attester as string) ?? '', recipient: (e.attestationPayload?.recipient as string) ?? '',
    evidenceHash: (e.attestationPayload?.evidenceHash as string) ?? '', revocable: Boolean(e.attestationPayload?.revocable ?? true),
    quorum: Number(e.attestationPayload?.quorum ?? 1), maxQuorum: Number(e.attestationPayload?.maxQuorum ?? 3),
    rawPayload: e.attestationPayload ?? {},
  } : undefined;
  return { id: e.id, date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), block: e.blockNumber ? `#${Number(e.blockNumber).toLocaleString()}` : '', signalType: e.signalType as any, signalLabel: e.signalType, signalSub: e.signalSub, source: e.source, sourceType: e.sourceType, delta: e.delta, scoreAfter: e.scoreAfter, txHash: e.txHash ?? '', attestation };
}

export async function getScoreHeader(wallet: string): Promise<ScoreHeader> {
  // try {
    const [profileRes, eventsRes] = await Promise.all([
      apiClient.get<ApiProfile>(`/score/${wallet}/profile`),
      apiClient.get<ApiScoreEvent[]>(`/score/${wallet}/events?limit=200`),
    ]);
    const p = profileRes.data; const events = eventsRes.data;
    const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
    const recent = events.filter(e => new Date(e.occurredAt).getTime() > thirtyDaysAgo);
    const positiveSignals30d = recent.filter(e => e.delta > 0).reduce((s, e) => s + e.delta, 0);
    const penalties30d = recent.filter(e => e.delta < 0).reduce((s, e) => s + e.delta, 0);
    return { score: p.score, maxScore: 1000, tier: p.tier as Tier, changePoints30d: positiveSignals30d + penalties30d, description: 'Your reputation is computed from on-chain repayments, DAO participation, cross-protocol attestations, and identity proofs.', positiveSignals30d, penalties30d, nextTier: (p.nextTier ?? '') as Tier, nextTierScore: p.nextTierScore ?? 0 };
  // } catch { return mock.header as ScoreHeader; }
}

export async function getScoreTrend(wallet: string): Promise<ScoreTrendPoint[]> {
  // try {
    const res = await apiClient.get<ApiScoreHistory[]>(`/score/${wallet}/db-history?limit=200`);
    return [...res.data].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()).slice(-30).map(r => ({ date: new Date(r.recordedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }), score: r.score }));
  // } catch { return mock.trend30d as ScoreTrendPoint[]; }
}

export async function getSignalBreakdown(wallet: string): Promise<SignalBreakdownItem[]> {
  // try {
    const res = await apiClient.get<ApiScoreEvent[]>(`/score/${wallet}/events?limit=200`);
    const buckets: Record<string, { points: number; color: string; isNegative?: boolean }> = { 'Repayment': { points: 0, color: '#22c55e' }, 'Governance': { points: 0, color: '#6366f1' }, 'Cross-protocol': { points: 0, color: '#3b82f6' }, 'Identity': { points: 0, color: '#a855f7' }, 'Passive': { points: 0, color: '#64748b' }, 'Penalty': { points: 0, color: '#ef4444', isNegative: true } };
    for (const e of res.data) { const key = e.sourceType in buckets ? e.sourceType : (e.delta < 0 ? 'Penalty' : 'Passive'); buckets[key].points += e.delta; }
    const positiveTotal = Object.values(buckets).filter(b => !b.isNegative).reduce((s, b) => s + Math.abs(b.points), 1);
    const negativeTotal = Object.values(buckets).filter(b => b.isNegative).reduce((s, b) => s + Math.abs(b.points), 1);
    return Object.entries(buckets).filter(([, b]) => b.points !== 0).map(([label, b]) => ({ label, pct: Math.round((Math.abs(b.points) / (b.isNegative ? negativeTotal : positiveTotal)) * 100), points: b.points, color: b.color, isNegative: b.isNegative }));
  // } catch { return mock.signalBreakdown as SignalBreakdownItem[]; }
}

export async function getScoreEvents(wallet: string): Promise<ScoreEvent[]> {
  // try {
    const res = await apiClient.get<ApiScoreEvent[]>(`/score/${wallet}/events?limit=50`);
    return res.data.map(mapEventRow);
  // } catch { return mock.events as ScoreEvent[]; }
}
