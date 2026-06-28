import type { PoolStats, LpPosition, ApyBreakdown, PoolUtilisation, LpTransaction, YieldDataPoint } from '@/types/lend';
import { apiClient } from '@/lib/api/client';
// import mock from '@/lib/mock/lend.json';

interface ApiPoolOverview { totalAssets: string; totalOutstanding: string; utilisationBps: string; utilisationPercent: string; totalDeposited: string; paused: boolean; }
interface ApiVaultStats { totalAssets: string; totalShares: string; sharePrice: string; utilisationBps: number; reserveBalance: string; }
interface ApiApyStats { grossApyBps: string; grossApyPercent: string; netLpApyPercent: string; utilisationBps: string; lpShareBps: number; reserveShareBps: number; }
interface ApiPendingYield { wallet: string; shares: string; pendingUsdc: string; apyPercent: string; }
interface ApiVolume { date: string; borrowVolume: string; repayVolume: string; liquidationVolume: string; }
interface ApiPoolConfig { kinkBps: number; capBps: number; reserveFactorBps: number; maxUtilisationBps: number; }

export async function getPoolStats(): Promise<PoolStats> {
  // try {
    const [poolRes, vaultRes, apyRes, cfgRes] = await Promise.all([
      apiClient.get<ApiPoolOverview>('/pool/overview'),
      apiClient.get<ApiVaultStats>('/vault/stats'),
      apiClient.get<ApiApyStats>('/yield/apy'),
      apiClient.get<ApiPoolConfig>('/pool/config'),
    ]);
    return {
      tvl: vaultRes.data.totalAssets, sharesOutstanding: vaultRes.data.totalShares,
      netLpApyBps: Math.round(Number(apyRes.data.netLpApyPercent) * 100),
      utilisationBps: Number(poolRes.data.utilisationBps),
      kinkBps: cfgRes.data.kinkBps, capBps: cfgRes.data.capBps,
      sharePrice: vaultRes.data.sharePrice, sharePriceDeltaBps: 0,
    };
  // } catch { return mock.poolStats as PoolStats; }
}

export async function getLpPosition(wallet: string): Promise<LpPosition> {
  // try {
    const [sharesRes, pendingRes, apyRes] = await Promise.all([
      apiClient.get<{ wallet: string; shares: string; usdcValue: string }>(`/vault/shares/${wallet}`),
      apiClient.get<ApiPendingYield>(`/yield/pending/${wallet}`),
      apiClient.get<ApiApyStats>('/yield/apy'),
    ]);
    const netApyBps = Math.round(Number(apyRes.data.netLpApyPercent) * 100);
    const usdcValue = Number(sharesRes.data.usdcValue) / 1e6;
    return {
      shares: sharesRes.data.shares, usdcValue: sharesRes.data.usdcValue,
      poolShareBps: 0, netApyBps,
      dailyYield: (usdcValue * (netApyBps / 10000) / 365).toFixed(6),
      annualYield: (usdcValue * (netApyBps / 10000)).toFixed(6),
      pendingYield: pendingRes.data.pendingUsdc,
      totalDeposited: sharesRes.data.usdcValue, redemptionValue: sharesRes.data.usdcValue,
    };
  // } catch { return mock.lpPosition as LpPosition; }
}

export async function getApyBreakdown(): Promise<ApyBreakdown> {
  // try {
    const res = await apiClient.get<ApiApyStats>('/yield/apy');
    const grossBps = Math.round(Number(res.data.grossApyPercent) * 100);
    const netBps = Math.round(Number(res.data.netLpApyPercent) * 100);
    return { grossApyBps: grossBps, reserveCutBps: grossBps - netBps, netLpApyBps: netBps };
  // } catch { return mock.apyBreakdown as ApyBreakdown; }
}

export async function getPoolUtilisation(): Promise<PoolUtilisation> {
  // try {
    const [poolRes, apyRes, vaultRes, cfgRes] = await Promise.all([
      apiClient.get<ApiPoolOverview>('/pool/overview'),
      apiClient.get<ApiApyStats>('/yield/apy'),
      apiClient.get<ApiVaultStats>('/vault/stats'),
      apiClient.get<ApiPoolConfig>('/pool/config'),
    ]);
    const grossBps = Math.round(Number(apyRes.data.grossApyPercent) * 100);
    const netBps = Math.round(Number(apyRes.data.netLpApyPercent) * 100);
    return {
      currentUtilBps: Number(poolRes.data.utilisationBps), currentBorrowAprBps: grossBps,
      kinkBps: cfgRes.data.kinkBps, capBps: cfgRes.data.capBps,
      grossPoolApyBps: grossBps, reserveFactorBps: cfgRes.data.reserveFactorBps,
      reserveBalance: vaultRes.data.reserveBalance, atKinkWarningBps: cfgRes.data.kinkBps,
    };
  // } catch { return mock.poolUtilisation as PoolUtilisation; }
}

export async function getLpTransactions(_wallet: string): Promise<LpTransaction[]> {
  return [];
}

export async function getYieldChart7d(): Promise<YieldDataPoint[]> {
  // try {
    const [volRes, apyRes] = await Promise.all([
      apiClient.get<ApiVolume[]>('/analytics/volume?days=7'),
      apiClient.get<ApiApyStats>('/yield/apy'),
    ]);
    const annualRate = Math.round(Number(apyRes.data.netLpApyPercent) * 100) / 10_000;
    return volRes.data.map(v => ({
      date: v.date,
      dailyYield: (Number(v.borrowVolume) / 1e6 * annualRate / 365).toFixed(6),
      borrowVolume: (Number(v.borrowVolume) / 1e6).toFixed(2),
    }));
  // } catch { return mock.yieldChart7d as YieldDataPoint[]; }
}
