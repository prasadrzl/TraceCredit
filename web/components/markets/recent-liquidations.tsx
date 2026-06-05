'use client';

import { useRecentLiquidations, useLiquidationStats } from '@/hooks/use-markets';
import { Skeleton } from '@/components/ui/skeleton';

const TIER_COLOURS: Record<string, string> = {
  Diamond:  'var(--tier-diamond)',
  Platinum: 'var(--tier-platinum)',
  Gold:     'var(--tier-gold)',
  Silver:   'var(--tier-silver)',
  Bronze:   'var(--tier-bronze)',
};

function fmtUsdc(raw: string): string {
  const n = Number(raw) / 1_000_000;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtLarge(raw: string): string {
  const n = Number(raw) / 1_000_000;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export function RecentLiquidations() {
  const { data: items, isLoading: il } = useRecentLiquidations();
  const { data: stats, isLoading: sl } = useLiquidationStats();

  return (
    <div className="card-base space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Recent Liquidations</span>
        {stats && (
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>
            all-time · {stats.total} total
          </span>
        )}
      </div>

      {/* Summary row */}
      {sl ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 bg-bg-surface" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="surface-base p-2.5">
            <p className="text-text-tertiary mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recovered</p>
            <p className="font-mono font-medium text-text-primary" style={{ fontSize: 14 }}>{fmtLarge(stats.totalRecovered)}</p>
          </div>
          <div className="surface-base p-2.5">
            <p className="text-text-tertiary mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Written off</p>
            <p className="font-mono font-medium" style={{ fontSize: 14, color: 'var(--danger)' }}>{fmtLarge(stats.totalWrittenOff)}</p>
          </div>
          <div className="surface-base p-2.5">
            <p className="text-text-tertiary mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recovery rate</p>
            <p className="font-mono font-medium text-text-primary" style={{ fontSize: 14 }}>{(stats.recoveryRateBps / 100).toFixed(0)}%</p>
          </div>
        </div>
      )}

      {/* List */}
      {il ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 bg-bg-surface" />)}
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-soft)]">
          {(items ?? []).map((item) => {
            const tierCol = TIER_COLOURS[item.tier] ?? 'var(--text-tertiary)';
            return (
              <div key={item.loanId} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  {/* Left: loan info */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-text-primary font-medium" style={{ fontSize: 12 }}>Loan #{item.loanId}</span>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
                        style={{ fontSize: 10, fontWeight: 500, background: `${tierCol}22`, color: tierCol }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tierCol }} />
                        {item.tier}
                      </span>
                    </div>
                    <span className="font-mono text-text-tertiary" style={{ fontSize: 11 }}>{item.borrower}</span>
                  </div>

                  {/* Right: amounts + age */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-medium" style={{ fontSize: 12, color: 'var(--success)' }}>
                      {fmtUsdc(item.recovered)} recovered
                    </p>
                    <p className="font-mono" style={{ fontSize: 12, color: 'var(--danger)' }}>
                      {fmtUsdc(item.writtenOff)} written off
                    </p>
                    <p className="text-text-tertiary mt-0.5" style={{ fontSize: 11 }}>
                      {item.daysAgo}d ago
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
