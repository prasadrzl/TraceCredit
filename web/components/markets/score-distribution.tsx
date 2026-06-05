'use client';

import { useEffect, useState } from 'react';
import { useScoreDistribution, useTierDistribution, useScoreDistMeta } from '@/hooks/use-markets';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const TIER_COLOURS: Record<string, string> = {
  Diamond:  'var(--tier-diamond)',
  Platinum: 'var(--tier-platinum)',
  Gold:     'var(--tier-gold)',
  Silver:   'var(--tier-silver)',
  Bronze:   'var(--tier-bronze)',
};

const TIERS = ['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze'] as const;

function bucketColor(bucket: number): string {
  if (bucket >= 850) return 'var(--tier-diamond)';
  if (bucket >= 700) return 'var(--tier-platinum)';
  if (bucket >= 500) return 'var(--tier-gold)';
  if (bucket >= 250) return 'var(--tier-silver)';
  return 'var(--tier-bronze)';
}

export function ScoreDistribution() {
  const { data: dist,  isLoading: dl } = useScoreDistribution();
  const { data: tiers, isLoading: tl } = useTierDistribution();
  const { data: meta,  isLoading: ml } = useScoreDistMeta();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLoading = dl || tl || ml;

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Borrower Score Distribution</span>
        {meta && (
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>
            {meta.totalWallets} wallets · {meta.activeWallets} active
          </span>
        )}
      </div>

      {isLoading || !mounted ? (
        <Skeleton className="h-32 w-full bg-bg-surface" />
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={dist ?? []} barCategoryGap="20%" margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
              ticks={[0, 200, 400, 600, 800]}
            />
            <YAxis hide />
            <Tooltip
              formatter={(v: number) => [v, 'Wallets']}
              labelFormatter={(l: number) => `Score ${l}–${l + 99}`}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: 'none' }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {(dist ?? []).map((entry) => (
                <Cell key={entry.bucket} fill={bucketColor(entry.bucket)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 bg-bg-surface" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {TIERS.map((tier) => {
            const pct = tiers?.[tier] ?? 0;
            const col = TIER_COLOURS[tier];
            return (
              <div key={tier} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 w-20 flex-shrink-0">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: col }} />
                  <span className="text-text-secondary" style={{ fontSize: 12 }}>{tier}</span>
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-bg-surface overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
                </div>
                <span className="font-mono text-text-tertiary w-8 text-right" style={{ fontSize: 12 }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
