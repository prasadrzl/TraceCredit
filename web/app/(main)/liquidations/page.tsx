'use client';

import { useQuery } from '@tanstack/react-query';
import { getLiquidationSummary, getLiquidationRecords, getRecoveryBreakdown, getReserveFund, getKeeperBot, getLiqActivity } from '@/lib/data/liquidation';
import { LiquidationStatCards } from '@/components/liquidations/liquidation-stat-cards';
import { LiquidationTable } from '@/components/liquidations/liquidation-table';
import { RecoveryPanel } from '@/components/liquidations/recovery-panel';
import { ReserveFundPanel } from '@/components/liquidations/reserve-fund-panel';
import { KeeperBotPanel } from '@/components/liquidations/keeper-bot-panel';
import { LiqActivityFeed } from '@/components/liquidations/activity-feed';

function useAll() {
  const summary    = useQuery({ queryKey: ['liq','summary'],    queryFn: getLiquidationSummary, staleTime: 30_000 });
  const records    = useQuery({ queryKey: ['liq','records'],    queryFn: getLiquidationRecords, staleTime: 30_000 });
  const breakdown  = useQuery({ queryKey: ['liq','breakdown'],  queryFn: getRecoveryBreakdown,  staleTime: 60_000 });
  const fund       = useQuery({ queryKey: ['liq','fund'],       queryFn: getReserveFund,         staleTime: 30_000 });
  const keeper     = useQuery({ queryKey: ['liq','keeper'],     queryFn: getKeeperBot,           staleTime: 10_000, refetchInterval: 10_000 });
  const activity   = useQuery({ queryKey: ['liq','activity'],   queryFn: getLiqActivity,         staleTime: 30_000 });
  return { summary, records, breakdown, fund, keeper, activity };
}

export default function LiquidationsPage() {
  const { summary, records, breakdown, fund, keeper, activity } = useAll();

  return (
    <div className="container py-6 space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-text-primary" style={{ fontSize: 22 }}>Liquidations</h1>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 13 }}>Defaulted loan recovery — keeper-driven, transparent on Base</p>
        </div>
        <div className="flex items-center gap-2">
          {keeper.data && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--success-subtle)', border: '0.5px solid var(--success)' }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-[var(--success)]" />
              <span className="font-medium" style={{ fontSize: 12, color: 'var(--success)' }}>Keeper online</span>
            </div>
          )}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors" style={{ border: '0.5px solid var(--border)', fontSize: 13 }}>
            ↓ Export
          </button>
        </div>
      </div>

      {summary.data && <LiquidationStatCards summary={summary.data} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left: table */}
        <div className="space-y-4">
          {records.data && <LiquidationTable records={records.data} />}
        </div>

        {/* Right: panels */}
        <div className="space-y-4">
          {breakdown.data && <RecoveryPanel breakdown={breakdown.data} />}
          {fund.data       && <ReserveFundPanel fund={fund.data} />}
          {keeper.data     && <KeeperBotPanel bot={keeper.data} />}
        </div>
      </div>

      {/* Activity feed full width */}
      {activity.data && <LiqActivityFeed activities={activity.data} />}
    </div>
  );
}
