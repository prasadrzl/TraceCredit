'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { DashboardStatCards }   from '@/components/dashboard/stat-cards';
import { PoolUtilisationPanel } from '@/components/dashboard/pool-utilisation-panel';
import { VolumeChart }          from '@/components/dashboard/volume-chart';
import { AtRiskPositions }      from '@/components/dashboard/at-risk-positions';
import { LiveActivityFeed }     from '@/components/dashboard/live-activity-feed';
import { BorrowersByTier }      from '@/components/dashboard/borrowers-by-tier';
import { ProtocolHealth }       from '@/components/dashboard/protocol-health';
function PageHeader() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [blockAge, setBlockAge] = useState(0);
  const blockNumber = '—';

  useEffect(() => {
    const id = setInterval(() => setBlockAge((a: number) => a + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['dash'] });
    setRefreshing(false);
  };

  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h1 className="font-medium text-text-primary" style={{ fontSize: 20 }}>Dashboard</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
          <span className="text-text-secondary" style={{ fontSize: 11 }}>All systems operational</span>
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>·</span>
          <span className="font-mono text-text-tertiary" style={{ fontSize: 11 }}>
            Last block #{blockNumber.toLocaleString()} · {blockAge}s ago
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-bg-card px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-surface transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <Link
          href="/borrow"
          className="rounded-md bg-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-hover transition-colors"
        >
          Borrow USDC
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="container py-6 pb-10">
      <PageHeader />

      {/* Stat cards */}
      <div className="mb-4">
        <DashboardStatCards />
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">

        {/* Left column */}
        <div className="flex flex-col gap-4 min-w-0">
          <PoolUtilisationPanel />
          <VolumeChart />
          <div className="flex-1 flex flex-col">
            <AtRiskPositions />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <LiveActivityFeed />
          <BorrowersByTier />
          <div className="flex-1 flex flex-col">
            <ProtocolHealth />
          </div>
        </div>

      </div>
    </div>
  );
}
