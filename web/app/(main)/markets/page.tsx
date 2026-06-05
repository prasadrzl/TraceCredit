'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { MarketStatCards }    from '@/components/markets/market-stat-cards';
import { BorrowVolumeChart }  from '@/components/markets/borrow-volume-chart';
import { RecentBorrowsTable } from '@/components/markets/recent-borrows-table';
import { PoolDepthChart }     from '@/components/markets/pool-depth-chart';
import { ScoreDistribution }  from '@/components/markets/score-distribution';
import { RecentLiquidations } from '@/components/markets/recent-liquidations';

type Tab = 'overview' | 'loans' | 'liquidations' | 'rates';
const TABS: { label: string; value: Tab }[] = [
  { label: 'Overview',     value: 'overview'     },
  { label: 'Loans',        value: 'loans'        },
  { label: 'Liquidations', value: 'liquidations' },
  { label: 'Rates',        value: 'rates'        },
];

export default function MarketsPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="container py-6 pb-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-medium text-text-primary" style={{ fontSize: 20 }}>Markets</h1>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 12 }}>
            Protocol activity, pool depth, and liquidation history
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--success)]" />
          </span>
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>Live · updated every block</span>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-0 border-b border-[var(--border)] mb-5">
        {TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors relative',
              tab === value
                ? 'text-brand'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {label}
            {tab === value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'loans'    && <PlaceholderTab title="Loans" description="Full loan history and active positions" />}
      {tab === 'liquidations' && <PlaceholderTab title="Liquidations" description="Complete liquidation records and recovery stats" />}
      {tab === 'rates'    && <PlaceholderTab title="Rates" description="Interest rate model parameters and tier schedules" />}
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-4">
      {/* 5 stat cards */}
      <MarketStatCards />

      {/* 2-column main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-4 min-w-0">
          <BorrowVolumeChart />
          <RecentBorrowsTable />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <PoolDepthChart />
          <ScoreDistribution />
          <RecentLiquidations />
        </div>

      </div>
    </div>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="card-base flex flex-col items-center justify-center py-20 text-center">
      <p className="font-medium text-text-primary" style={{ fontSize: 15 }}>{title}</p>
      <p className="text-text-tertiary mt-1" style={{ fontSize: 13 }}>{description}</p>
      <p className="text-text-tertiary mt-3" style={{ fontSize: 11 }}>Coming soon</p>
    </div>
  );
}
