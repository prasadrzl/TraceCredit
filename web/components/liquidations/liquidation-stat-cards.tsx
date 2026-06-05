'use client';

import type { LiquidationSummary } from '@/types/liquidation';
import { AlertTriangle, TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react';

function fmt(n: string) {
  const v = Number(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v}`;
}

interface Props { summary: LiquidationSummary }

export function LiquidationStatCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="card-base">
        <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total liquidations</span>
        </div>
        <p className="font-mono font-bold text-text-primary" style={{ fontSize: 28 }}>{summary.totalLiquidations}</p>
        <p className="text-text-tertiary" style={{ fontSize: 11 }}>all time · {summary.allTimePctOfLoans}% of loans</p>
      </div>

      <div className="card-base">
        <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
          <TrendingUp className="h-3.5 w-3.5" />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total recovered</span>
        </div>
        <p className="font-mono font-bold" style={{ fontSize: 28, color: 'var(--success)' }}>{fmt(summary.totalRecovered)}</p>
        <p style={{ fontSize: 11, color: 'var(--success)' }}>↗ {summary.recoveredPctOfPrincipal}% of principal</p>
      </div>

      <div className="card-base">
        <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total written off</span>
        </div>
        <p className="font-mono font-bold" style={{ fontSize: 28, color: 'var(--danger)' }}>{fmt(summary.totalWrittenOff)}</p>
        <p className="text-text-tertiary" style={{ fontSize: 11 }}>covered by reserve fund</p>
      </div>

      <div className="card-base">
        <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recovery rate</span>
        </div>
        <p className="font-mono font-bold text-text-primary" style={{ fontSize: 28 }}>{summary.recoveryRate.toFixed(1)}%</p>
        <p style={{ fontSize: 11, color: 'var(--success)' }}>↗ +{summary.recoveryRateChange}% vs last 90d</p>
      </div>
    </div>
  );
}
