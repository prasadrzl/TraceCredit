'use client';

import { useNetPosition } from '@/hooks/use-portfolio';
import { Skeleton } from '@/components/ui/skeleton';

interface Props { wallet: string }

export function NetWorthBand({ wallet }: Props) {
  const { data, isLoading } = useNetPosition(wallet);

  if (isLoading || !data) {
    return (
      <div className="card-base">
        <div className="flex items-center gap-6">
          <Skeleton className="h-8 w-32 bg-bg-surface" />
          <Skeleton className="h-5 w-48 bg-bg-surface" />
        </div>
      </div>
    );
  }

  const net   = Number(data.netValue) / 1_000_000;
  const lp    = Number(data.lpValue) / 1_000_000;
  const debt  = Number(data.outstandingDebt) / 1_000_000;
  const yield_ = Number(data.yieldEarned) / 1_000_000;

  const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="card-base">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 11 }}>Net position</p>
          <p className="font-mono font-bold text-text-primary" style={{ fontSize: 26 }}>${fmt(net)}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div>
            <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10 }}>LP value</p>
            <p className="font-mono font-medium" style={{ fontSize: 14, color: 'var(--success)' }}>+${fmt(lp)}</p>
          </div>
          <div>
            <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10 }}>Outstanding debt</p>
            <p className="font-mono font-medium" style={{ fontSize: 14, color: 'var(--danger)' }}>−${fmt(debt)}</p>
          </div>
          <div>
            <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10 }}>Yield earned</p>
            <p className="font-mono font-medium" style={{ fontSize: 14, color: 'var(--success)' }}>+${fmt(yield_)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
