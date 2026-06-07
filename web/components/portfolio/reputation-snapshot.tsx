'use client';

import { TierBadge } from '@/components/common/tier-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReputationSnap } from '@/hooks/use-portfolio';

interface Props { wallet: string }

export function ReputationSnapshot({ wallet }: Props) {
  const { data, isLoading } = useReputationSnap(wallet);

  if (isLoading || !data) {
    return (
      <div className="card-base space-y-3">
        <Skeleton className="h-5 w-40 bg-bg-surface" />
        <Skeleton className="h-16 w-full bg-bg-surface" />
        <Skeleton className="h-12 w-full bg-bg-surface" />
      </div>
    );
  }

  const total = data.signals.reduce((sum, s) => sum + s.points, 0);

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Reputation</span>
        <TierBadge tier={data.tier} />
      </div>

      <div className="flex items-center gap-4">
        <div>
          <p className="font-mono font-bold text-text-primary" style={{ fontSize: 28 }}>{data.score}</p>
          <p className="text-text-tertiary" style={{ fontSize: 11 }}>
            {data.change30d > 0 ? '+' : ''}{data.change30d} pts (30d)
          </p>
        </div>
        <div className="flex-1">
          <div className="flex gap-0.5 h-6 rounded overflow-hidden">
            {data.signals.map((s, i) => (
              <div
                key={i}
                style={{
                  flex: Math.abs(s.points),
                  background: s.color,
                  opacity: s.points < 0 ? 0.7 : 1,
                }}
                title={`${s.label}: ${s.points > 0 ? '+' : ''}${s.points}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {data.signals.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: s.color }} />
                <span className="text-text-tertiary" style={{ fontSize: 10 }}>
                  {s.label} {s.points > 0 ? '+' : ''}{s.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
