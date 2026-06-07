'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useSignalBreakdown, useNetScore } from '@/hooks/use-reputation';
import type { SignalType } from '@/types/reputation';

interface Props { wallet: string }

const TYPE_COLOR: Record<SignalType, string> = {
  repayment: 'var(--success)',
  dao:       'var(--brand)',
  cross:     'var(--tier-platinum)',
  late:      'var(--danger)',
  wallet:    'var(--text-secondary)',
  holdings:  'var(--text-secondary)',
  stake:     'var(--tier-gold)',
  decay:     'var(--text-tertiary)',
};

export function SignalBreakdown({ wallet }: Props) {
  const { data: signals, isLoading: sl } = useSignalBreakdown(wallet);
  const { data: net }                     = useNetScore(wallet);

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Signal Breakdown</span>
        {net && (
          <span className="text-text-tertiary" style={{ fontSize: 12 }}>
            {net.netPoints} net pts
          </span>
        )}
      </div>

      {sl || !signals ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-bg-surface" />)}
        </div>
      ) : (
        <>
          {net && (
            <div className="flex gap-0.5 h-3 rounded overflow-hidden mb-1">
              {signals.filter(s => s.points > 0).map((s) => (
                <div
                  key={s.id}
                  style={{ flex: s.points, background: TYPE_COLOR[s.type] }}
                  title={`${s.label}: +${s.points}`}
                />
              ))}
              {signals.filter(s => s.points < 0).map((s) => (
                <div
                  key={s.id}
                  style={{ flex: Math.abs(s.points), background: TYPE_COLOR[s.type], opacity: 0.7 }}
                  title={`${s.label}: ${s.points}`}
                />
              ))}
            </div>
          )}

          <div className="space-y-1">
            {signals.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: TYPE_COLOR[s.type] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary" style={{ fontSize: 13 }}>{s.label}</p>
                  {(s.count !== undefined || s.meta) && (
                    <p className="text-text-tertiary" style={{ fontSize: 11 }}>
                      {s.count !== undefined ? `${s.count}×` : ''} {s.meta ?? ''}
                    </p>
                  )}
                </div>
                <span
                  className="font-mono font-medium shrink-0"
                  style={{ fontSize: 13, color: s.points > 0 ? 'var(--success)' : 'var(--danger)' }}
                >
                  {s.points > 0 ? '+' : ''}{s.points}
                </span>
              </div>
            ))}
          </div>

          {net && (
            <div className="surface-base p-2.5 rounded-lg flex justify-between items-center">
              <span className="text-text-secondary" style={{ fontSize: 12 }}>Base + tier bonus → displayed</span>
              <span className="font-mono font-medium text-text-primary" style={{ fontSize: 13 }}>
                {net.base} + {net.tierBonus} = {net.displayed}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
