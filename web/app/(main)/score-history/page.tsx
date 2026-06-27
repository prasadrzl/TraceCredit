'use client';

import { useAccount } from 'wagmi';
import { useScoreHeader, useScoreTrend, useSignalBreakdown, useScoreEvents } from '@/hooks/use-score-history';
import { ScoreHeaderCard } from '@/components/score-history/score-header-card';
import { ScoreTrendChart } from '@/components/score-history/trend-chart';
import { SignalBreakdown } from '@/components/score-history/signal-breakdown';
import { EventTable } from '@/components/score-history/event-table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Award } from 'lucide-react';

export default function ScoreHistoryPage() {
  const { address, isConnected } = useAccount();
  const wallet = address ?? '';

  const { data: header,    isLoading: hl } = useScoreHeader(wallet);
  const { data: trend,     isLoading: tl } = useScoreTrend(wallet);
  const { data: breakdown, isLoading: bl } = useSignalBreakdown(wallet);
  const { data: events,    isLoading: el } = useScoreEvents(wallet);

  const shortWallet = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : 'Not connected';

  return (
    <div className="container py-6 space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-text-primary" style={{ fontSize: 22 }}>Score history</h1>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 13 }}>Every signal that has changed your reputation score — fully on-chain and verifiable</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--success-subtle)', border: '0.5px solid var(--success)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              <span className="font-mono text-text-secondary" style={{ fontSize: 12 }}>Wallet {shortWallet}</span>
            </div>
          )}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors" style={{ border: '0.5px solid var(--border)', fontSize: 13 }}>
            ↓ Export
          </button>
        </div>
      </div>

      {/* Score header card */}
      {hl ? (
        <Skeleton className="h-36 bg-bg-surface" />
      ) : header ? (
        <ScoreHeaderCard header={header} />
      ) : !isConnected ? (
        <div className="card-base">
          <EmptyState
            icon={<Award size={22} />}
            title="Connect your wallet"
            description="Connect a wallet to see your on-chain reputation score history."
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4">
          {/* Trend chart */}
          {tl ? (
            <Skeleton className="h-52 bg-bg-surface" />
          ) : (trend && trend.length > 0) ? (
            <ScoreTrendChart data={trend} />
          ) : null}

          {/* Event table — always rendered when wallet is connected */}
          {el ? (
            <div className="card-base space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 bg-bg-surface" />)}
            </div>
          ) : (
            <EventTable events={events ?? []} />
          )}
        </div>

        <div>
          {/* Signal breakdown */}
          {bl ? (
            <Skeleton className="h-64 bg-bg-surface" />
          ) : (breakdown && breakdown.length > 0) ? (
            <SignalBreakdown items={breakdown} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
