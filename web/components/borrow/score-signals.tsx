'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useScoreSignals } from '@/hooks/use-borrow';
import type { SignalType } from '@/types/borrow';

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

export function ScoreSignals({ wallet }: Props) {
  const { data, isLoading } = useScoreSignals(wallet);

  return (
    <div className="card-base space-y-3">
      <span className="text-base font-medium text-text-primary">Recent Signals</span>

      {isLoading || !data ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-bg-surface" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {data.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: TYPE_COLOR[s.type] }} />
                <div className="min-w-0">
                  <p className="text-text-primary truncate" style={{ fontSize: 13 }}>{s.label}</p>
                  <p className="text-text-tertiary truncate" style={{ fontSize: 11 }}>{s.sub}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-mono font-medium" style={{ fontSize: 13, color: s.points > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {s.points > 0 ? '+' : ''}{s.points}
                </span>
                <span className="text-text-tertiary" style={{ fontSize: 11 }}>{s.daysAgo}d ago</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
