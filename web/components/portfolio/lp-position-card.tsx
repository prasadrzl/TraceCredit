'use client';

import { UsdcAmount } from '@/components/common/usdc-amount';
import { Skeleton } from '@/components/ui/skeleton';
import { usePositionStats } from '@/hooks/use-portfolio';

interface Props { wallet: string }

export function LpPositionCard({ wallet }: Props) {
  const { data, isLoading } = usePositionStats(wallet);

  if (isLoading || !data) {
    return (
      <div className="card-base space-y-3">
        <Skeleton className="h-5 w-32 bg-bg-surface" />
        <Skeleton className="h-16 w-full bg-bg-surface" />
      </div>
    );
  }

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">LP Position</span>
        <span className="font-medium" style={{ fontSize: 13, color: 'var(--success)' }}>
          {(data.lpApyBps / 100).toFixed(2)}% APY
        </span>
      </div>

      <div className="surface-base p-3 rounded-lg">
        <p className="text-text-tertiary mb-0.5" style={{ fontSize: 11 }}>Pool value</p>
        <UsdcAmount raw={String(Number(data.lpShares) * 1_041_700 / 1e12)} className="font-mono font-semibold text-text-primary" style={{ fontSize: 20 } as React.CSSProperties} />
        <p className="text-text-tertiary mt-0.5" style={{ fontSize: 11 }}>
          {data.sbtUnlockDelay} · pending <UsdcAmount raw={data.pendingYield} compact />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>SBT Stake</p>
          <UsdcAmount raw={data.sbtStakeLocked} className="font-mono font-medium text-text-primary" style={{ fontSize: 14 } as React.CSSProperties} />
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>locked</p>
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Yield</p>
          <UsdcAmount raw={data.pendingYield} className="font-mono font-medium" style={{ fontSize: 14, color: 'var(--success)' } as React.CSSProperties} />
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>unclaimed</p>
        </div>
      </div>
    </div>
  );
}
