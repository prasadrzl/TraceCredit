'use client';

import { useScoreHeader, useScoreTrend, useSignalBreakdown, useScoreEvents } from '@/hooks/use-score-history';
import { ScoreHeaderCard } from '@/components/score-history/score-header-card';
import { ScoreTrendChart } from '@/components/score-history/trend-chart';
import { SignalBreakdown } from '@/components/score-history/signal-breakdown';
import { EventTable } from '@/components/score-history/event-table';

const MOCK_WALLET = '0x3f2a9c14';

export default function ScoreHistoryPage() {
  const { data: header }    = useScoreHeader(MOCK_WALLET);
  const { data: trend }     = useScoreTrend(MOCK_WALLET);
  const { data: breakdown } = useSignalBreakdown(MOCK_WALLET);
  const { data: events }    = useScoreEvents(MOCK_WALLET);

  return (
    <div className="container py-6 space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-text-primary" style={{ fontSize: 22 }}>Score history</h1>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 13 }}>Every signal that has changed your reputation score — fully on-chain and verifiable</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--success-subtle)', border: '0.5px solid var(--success)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            <span className="font-mono text-text-secondary" style={{ fontSize: 12 }}>Wallet 0x3f2a…9c14</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors" style={{ border: '0.5px solid var(--border)', fontSize: 13 }}>
            ↓ Export
          </button>
        </div>
      </div>

      {header && <ScoreHeaderCard header={header} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4">
          {trend && <ScoreTrendChart data={trend} />}
          {events && <EventTable events={events} />}
        </div>
        <div>
          {breakdown && <SignalBreakdown items={breakdown} />}
        </div>
      </div>
    </div>
  );
}
