import type { DailyVolume } from '@/types/api';
import type { MarketStats, MarketBorrowEntry, PoolDepthPoint, PoolDepthStats, ScoreBucket, TierDistribution, ScoreDistributionMeta, MarketLiquidationEntry, MarketLiquidationStats } from '@/types/markets';
import type { Tier } from '@/types/api';
import { apiClient } from '@/lib/api/client';
import mock from '@/lib/mock/markets.json';

interface ApiProtocolStats { tvl: string; totalVolumeBorrowed: string; totalVolumeRepaid: string; utilisationBps: string; activeBorrowers: number; totalLiquidations: number; lastUpdated: number; }
interface ApiVolume { date: string; borrowVolume: string; repayVolume: string; liquidationVolume: string; }
interface ApiPoolOverview { totalAssets: string; totalOutstanding: string; utilisationBps: string; utilisationPercent: string; }
interface ApiBorrowEvent { loanId: string; borrower: string; amount: string; timestamp: number; txHash: string; }
interface ApiLiqRecord { id: string; loanId: string; borrower: string; recoveredAmount: string; writtenOffAmount: string; txHash: string; liquidatedAt: string; }
interface ApiLiqStats { totalLiquidations: number; totalRecovered: string; totalWrittenOff: string; }

export async function getMarketStats(): Promise<MarketStats> {
  try {
    const [statsRes, volRes] = await Promise.all([
      apiClient.get<ApiProtocolStats>('/analytics/protocol'),
      apiClient.get<ApiVolume[]>('/analytics/volume?days=2'),
    ]);
    const s = statsRes.data; const vols = volRes.data;
    const today = vols[vols.length - 1]; const yesterday = vols[vols.length - 2];
    const borrow24h = today ? Number(today.borrowVolume) / 1e6 : 0;
    const repay24h = today ? Number(today.repayVolume) / 1e6 : 0;
    const prevBorrow = yesterday ? Number(yesterday.borrowVolume) / 1e6 : borrow24h;
    const prevRepay = yesterday ? Number(yesterday.repayVolume) / 1e6 : repay24h;
    return {
      borrowVol24h: borrow24h.toFixed(2), repayVol24h: repay24h.toFixed(2),
      utilisationBps: Number(s.utilisationBps), liquidations24h: 0, liquidationsWrittenOff24h: '0',
      totalBorrowers: s.activeBorrowers, activeBorrowers: s.activeBorrowers, repaidBorrowers: 0,
      borrowVolDeltaBps: prevBorrow > 0 ? Math.round(((borrow24h - prevBorrow) / prevBorrow) * 10000) : 0,
      repayVolDeltaBps: prevRepay > 0 ? Math.round(((repay24h - prevRepay) / prevRepay) * 10000) : 0,
    };
  } catch { return mock.marketStats as MarketStats; }
}

export async function getMarketVolume(): Promise<DailyVolume[]> {
  try {
    const res = await apiClient.get<ApiVolume[]>('/analytics/volume?days=7');
    return res.data.map(v => ({ date: v.date, borrowVolume: v.borrowVolume, repayVolume: v.repayVolume, liquidationVolume: v.liquidationVolume }));
  } catch { return mock.volume7d as DailyVolume[]; }
}

export async function getRecentBorrows(): Promise<MarketBorrowEntry[]> {
  try {
    const res = await apiClient.get<ApiBorrowEvent[]>('/pool/borrows?first=20');
    return res.data.map(b => ({
      loanId: b.loanId, borrower: b.borrower, tier: 'Bronze' as Tier,
      principal: (Number(b.amount) / 1e6).toFixed(2), aprBps: 1400, state: 'Active' as const,
      deadline: new Date((b.timestamp + 30 * 86400) * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    }));
  } catch { return mock.recentBorrows as MarketBorrowEntry[]; }
}

export async function getPoolDepthCurve(): Promise<PoolDepthPoint[]> {
  return mock.poolDepthCurve as PoolDepthPoint[];
}

export async function getPoolDepthStats(): Promise<PoolDepthStats> {
  try {
    const res = await apiClient.get<ApiPoolOverview>('/pool/overview');
    return { currentUtilBps: Number(res.data.utilisationBps), belowKinkAprBps: 600, aboveKinkMinBps: 800, aboveKinkMaxBps: 9000, lpNetApyBps: 476, kinkBps: 7000, capBps: 9000, reserveFactorBps: 1500 };
  } catch { return mock.poolDepthStats as PoolDepthStats; }
}

export async function getScoreDistribution(): Promise<ScoreBucket[]> { return mock.scoreDistribution as ScoreBucket[]; }
export async function getTierDistribution(): Promise<TierDistribution> { return mock.tierDistribution as TierDistribution; }
export async function getScoreDistributionMeta(): Promise<ScoreDistributionMeta> { return mock.scoreDistributionMeta as ScoreDistributionMeta; }

export async function getRecentLiquidations(): Promise<MarketLiquidationEntry[]> {
  try {
    const res = await apiClient.get<ApiLiqRecord[]>('/liquidation?limit=10');
    return res.data.map(r => ({
      loanId: r.loanId, borrower: r.borrower, tier: 'Bronze' as Tier,
      recovered: (Number(r.recoveredAmount) / 1e6).toFixed(2),
      writtenOff: (Number(r.writtenOffAmount) / 1e6).toFixed(2),
      daysAgo: Math.floor((Date.now() - new Date(r.liquidatedAt).getTime()) / 86_400_000),
    }));
  } catch { return mock.recentLiquidations as MarketLiquidationEntry[]; }
}

export async function getLiquidationStats(): Promise<MarketLiquidationStats> {
  try {
    const res = await apiClient.get<ApiLiqStats>('/liquidation/stats');
    const s = res.data; const recovered = Number(s.totalRecovered) / 1e6; const writtenOff = Number(s.totalWrittenOff) / 1e6; const total = recovered + writtenOff;
    return { total: s.totalLiquidations, totalRecovered: recovered.toFixed(2), totalWrittenOff: writtenOff.toFixed(2), recoveryRateBps: total > 0 ? Math.round((recovered / total) * 10000) : 0 };
  } catch { return mock.liquidationStats as MarketLiquidationStats; }
}
