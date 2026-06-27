import { analyticsApi } from '@/lib/api/analytics';
import { vaultApi }     from '@/lib/api/vault';
import { yieldApi }     from '@/lib/api/yield';
import { priceApi }     from '@/lib/api/price';
import { apiClient }    from '@/lib/api/client';
import type {
  ProtocolStats, VaultStats, ApyStats, DailyVolume, PriceData,
} from '@/types/api';
import type { AtRiskPosition, BorrowersByTier, ProtocolHealthStatus } from '@/types/dashboard';
// import mock from '@/lib/mock/dashboard.json';

export async function getProtocolStats(): Promise<ProtocolStats> {
  // try {
    return await analyticsApi.getProtocolStats();
  // } catch { return mock.protocolStats as ProtocolStats; }
}

export async function getVaultStats(): Promise<VaultStats> {
  // try {
    return await vaultApi.getStats();
  // } catch { return mock.vaultStats as VaultStats; }
}

export async function getApyStats(): Promise<ApyStats> {
  // try {
    return await yieldApi.getApyStats();
  // } catch { return mock.apyStats as ApyStats; }
}

export async function getVolumeData(days: 7 | 30 | 90): Promise<DailyVolume[]> {
  // try {
    return await analyticsApi.getVolume(days);
  // } catch {
  //   const key = days <= 7 ? 'volume7d' : 'volume30d';
  //   return (mock as Record<string, unknown>)[key] as DailyVolume[];
  // }
}

export async function getUsdcPrice(): Promise<PriceData> {
  // try {
    return await priceApi.getUsdcPrice();
  // } catch { return mock.usdcPrice as PriceData; }
}

export async function getAtRiskPositions(): Promise<AtRiskPosition[]> {
  // try {
    const res = await apiClient.get<AtRiskPosition[]>('/pool/at-risk');
    return res.data;
  // } catch { return []; }
}

export async function getBorrowersByTier(): Promise<BorrowersByTier> {
  // try {
    const res = await apiClient.get<{ tiers: BorrowersByTier }>('/analytics/score-distribution');
    return res.data.tiers;
  // } catch { return { Diamond: 0, Platinum: 0, Gold: 0, Silver: 0, Bronze: 0 }; }
}

export async function getProtocolHealth(): Promise<ProtocolHealthStatus[]> {
  // try {
    const res = await apiClient.get<ProtocolHealthStatus[]>('/pool/health');
    return res.data;
  // } catch { return []; }
}

// export function getMockLastBlock() {
//   return mock.lastBlock;
// }
