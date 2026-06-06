'use client';

import type { HistorySummary } from '@/types/history';
import { Layers, DollarSign, RefreshCw, ShieldCheck } from 'lucide-react';

interface Props { summary: HistorySummary }

export function HistoryStatCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="card-base space-y-1">
        <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
          <Layers className="h-3.5 w-3.5" />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total loans</span>
        </div>
        <p className="font-mono font-bold text-text-primary" style={{ fontSize: 28 }}>{summary.totalLoans}</p>
        <p className="text-text-tertiary" style={{ fontSize: 11 }}>all time</p>
      </div>

      <div className="card-base space-y-1">
        <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
          <DollarSign className="h-3.5 w-3.5" />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total borrowed</span>
        </div>
        <p className="font-mono font-bold text-text-primary" style={{ fontSize: 28 }}>${Number(summary.totalBorrowed).toLocaleString()}</p>
        <p className="text-text-tertiary" style={{ fontSize: 11 }}>{summary.totalLoans} loans</p>
      </div>

      <div className="card-base space-y-1">
        <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
          <RefreshCw className="h-3.5 w-3.5" />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total repaid</span>
        </div>
        <p className="font-mono font-bold text-text-primary" style={{ fontSize: 28 }}>${Number(summary.totalRepaid).toLocaleString()}</p>
        <p className="text-text-tertiary" style={{ fontSize: 11 }}>{summary.repaidPct}% of borrowed</p>
      </div>

      <div className="card-base space-y-1">
        <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Defaults</span>
        </div>
        <p className="font-mono font-bold text-text-primary" style={{ fontSize: 28 }}>{summary.defaults}</p>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: 10, color: 'var(--success)' }}>● clean record</span>
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>{summary.defaultRate.toFixed(1)}% rate</span>
        </div>
      </div>
    </div>
  );
}
