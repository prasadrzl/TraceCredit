import type { LiquidationSummary, LiquidationRecord, RecoveryBreakdown, ReserveFund, KeeperBot, LiqActivity } from '@/types/liquidation';
import type { Tier } from '@/types/api';
import { apiClient } from '@/lib/api/client';
import mock from '../mock/liquidation.json';

interface ApiLiquidationRecord { id: string; loanId: string; borrower: string; recoveredAmount: string; writtenOffAmount: string; txHash: string; blockNumber: string; liquidatedAt: string; }
interface ApiLiquidationStats { totalLiquidations: number; totalRecovered: string; totalWrittenOff: string; }

function mapApiRecord(r: ApiLiquidationRecord): LiquidationRecord {
  const recovered = Number(r.recoveredAmount) / 1e6; const writtenOff = Number(r.writtenOffAmount) / 1e6;
  const total = recovered + writtenOff;
  return {
    loanNum: Number(r.loanId), loanTxHash: r.txHash,
    borrowerShort: r.borrower.slice(0, 6) + '…' + r.borrower.slice(-4),
    borrowerScore: 0, tier: 'Bronze' as Tier, principal: total.toFixed(2),
    recovered: recovered.toFixed(2), writtenOff: writtenOff.toFixed(2),
    recoveryPct: total > 0 ? Math.round((recovered / total) * 100) : 0,
    keeperTxHash: r.txHash,
    keeperDate: new Date(r.liquidatedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
  };
}

export async function getLiquidationRecords(): Promise<LiquidationRecord[]> {
  try {
    const res = await apiClient.get<ApiLiquidationRecord[]>('/liquidation?limit=100');
    return res.data.map(mapApiRecord);
  } catch { return mock.records as LiquidationRecord[]; }
}

export async function getLiquidationSummary(): Promise<LiquidationSummary> {
  try {
    const res = await apiClient.get<ApiLiquidationStats>('/liquidation/stats');
    const s = res.data; const recovered = Number(s.totalRecovered) / 1e6; const writtenOff = Number(s.totalWrittenOff) / 1e6; const total = recovered + writtenOff;
    return { totalLiquidations: s.totalLiquidations, allTimePctOfLoans: 0, totalRecovered: recovered.toFixed(2), recoveredPctOfPrincipal: total > 0 ? Math.round((recovered / total) * 100) : 0, totalWrittenOff: writtenOff.toFixed(2), recoveryRate: total > 0 ? Math.round((recovered / total) * 100) : 0, recoveryRateChange: 0 };
  } catch { return mock.summary as LiquidationSummary; }
}

export async function getRecoveryBreakdown(): Promise<RecoveryBreakdown> {
  try {
    const res = await apiClient.get<ApiLiquidationStats>('/liquidation/stats');
    const recovered = Number(res.data.totalRecovered) / 1e6; const writtenOff = Number(res.data.totalWrittenOff) / 1e6;
    return { recovered: Math.round(recovered), writtenOff: Math.round(writtenOff), total: Math.round(recovered + writtenOff) };
  } catch { return mock.recoveryBreakdown as RecoveryBreakdown; }
}

export async function getReserveFund(): Promise<ReserveFund> { return mock.reserveFund as ReserveFund; }
export async function getKeeperBot(): Promise<KeeperBot> { return mock.keeperBot as KeeperBot; }

export async function getLiqActivity(): Promise<LiqActivity[]> {
  try {
    const res = await apiClient.get<ApiLiquidationRecord[]>('/liquidation?limit=10');
    return res.data.map(r => {
      const date = new Date(r.liquidatedAt);
      return { timeUtc: date.toUTCString(), minsAgo: Math.floor((Date.now() - date.getTime()) / 60_000), loanNum: Number(r.loanId), borrowerShort: r.borrower.slice(0, 6) + '…' + r.borrower.slice(-4), recovered: (Number(r.recoveredAmount) / 1e6).toFixed(2), writtenOff: (Number(r.writtenOffAmount) / 1e6).toFixed(2), txHash: r.txHash, note: Number(r.writtenOffAmount) > 0 ? 'Partial recovery' : 'Full recovery', nextScanSecs: 0 };
    });
  } catch { return mock.activity as LiqActivity[]; }
}
