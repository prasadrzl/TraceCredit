'use client';

import { useBorrowersByTier, useDashboardStats } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

const TIERS = ['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze'] as const;
const TIER_COLOURS: Record<string, string> = {
  Diamond:  'var(--tier-diamond)',
  Platinum: 'var(--tier-platinum)',
  Gold:     'var(--tier-gold)',
  Silver:   'var(--tier-silver)',
  Bronze:   'var(--tier-bronze)',
};

export function BorrowersByTier() {
  const { data: tiers, isLoading: tl } = useBorrowersByTier();
  const { data: stats, isLoading: sl } = useDashboardStats();

  if (tl || sl) {
    return (
      <div className="card-base space-y-3">
        <Skeleton className="h-4 w-32 bg-bg-surface" />
        <Skeleton className="h-3 w-full bg-bg-surface rounded-full" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 bg-bg-surface" />)}
        </div>
      </div>
    );
  }

  const total = TIERS.reduce((s, t) => s + (tiers?.[t] ?? 0), 0);

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Borrowers by Tier</span>
        <span style={{ fontSize: 11 }} className="text-text-tertiary">
          {(stats?.activeBorrowers ?? total).toLocaleString()} active
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2.5 w-full rounded-full overflow-hidden gap-0.5">
        {TIERS.map((tier) => {
          const count = tiers?.[tier] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={tier}
              className="h-full flex-shrink-0"
              style={{ width: `${pct}%`, background: TIER_COLOURS[tier] }}
              title={`${tier}: ${count}`}
            />
          );
        })}
      </div>

      {/* Legend grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {TIERS.map((tier) => (
          <div key={tier} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: TIER_COLOURS[tier] }} />
              <span className="text-text-secondary" style={{ fontSize: 12 }}>{tier}</span>
            </div>
            <span className="font-mono text-text-primary font-medium" style={{ fontSize: 12 }}>
              {(tiers?.[tier] ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
