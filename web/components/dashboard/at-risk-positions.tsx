'use client';

import { useState } from 'react';
import { useAtRiskPositions } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

const TIER_COLOURS: Record<string, string> = {
  Diamond:  'var(--tier-diamond)',
  Platinum: 'var(--tier-platinum)',
  Gold:     'var(--tier-gold)',
  Silver:   'var(--tier-silver)',
  Bronze:   'var(--tier-bronze)',
};

function fmtUsdc(raw: string): string {
  const n = Number(raw) / 1_000_000;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export function AtRiskPositions() {
  const { data, isLoading } = useAtRiskPositions();
  const [tab, setTab] = useState<'at-risk' | 'recent'>('at-risk');

  return (
    <div className="card-base h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-base font-medium text-text-primary">At-Risk Positions</span>
          <span className="text-text-tertiary ml-2" style={{ fontSize: 11 }}>
            Health factor below 1.15 — sorted by proximity to threshold
          </span>
        </div>
        <div className="flex items-center rounded-md overflow-hidden border border-[var(--border)]">
          {(['at-risk', 'recent'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1 text-xs font-medium capitalize transition-colors',
                tab === t
                  ? 'bg-brand-subtle text-brand'
                  : 'text-text-secondary hover:bg-bg-surface',
              )}
            >
              {t === 'at-risk' ? 'At-risk' : 'Recent'}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-2 mb-2 px-0">
        {['BORROWER', 'TIER', 'DEBT', 'LTV / THRESHOLD', 'HEALTH'].map((h) => (
          <span key={h} className="text-text-tertiary" style={{ fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 bg-bg-surface" />)}
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-soft)]">
          {(data ?? []).map((pos) => {
            const health = pos.health;
            const healthColour =
              health < 1.0  ? 'var(--danger)'   :
              health < 1.10 ? 'var(--warning)'  :
                              'var(--text-primary)';
            const ltvColour = pos.ltv >= pos.threshold ? 'var(--danger)' : 'var(--warning)';

            return (
              <div
                key={pos.borrower}
                className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-2 items-center py-2.5"
              >
                {/* Borrower */}
                <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>
                  {pos.borrower}
                </span>

                {/* Tier badge */}
                <span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      background: `${TIER_COLOURS[pos.tier]}22`,
                      color: TIER_COLOURS[pos.tier],
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: TIER_COLOURS[pos.tier] }} />
                    {pos.tier}
                  </span>
                </span>

                {/* Debt */}
                <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>
                  {fmtUsdc(pos.debt)}
                </span>

                {/* LTV / Threshold */}
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ fontSize: 12, color: ltvColour }}>
                    {pos.ltv.toFixed(1)}%
                  </span>
                  <span className="text-text-tertiary" style={{ fontSize: 12 }}>/ {pos.threshold}%</span>
                  <div className="flex-1 h-1 rounded-full bg-bg-surface overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(pos.ltv / pos.threshold) * 100}%`, background: ltvColour }}
                    />
                  </div>
                </div>

                {/* Health */}
                <span className="font-mono font-medium text-right" style={{ fontSize: 12, color: healthColour }}>
                  {health.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
