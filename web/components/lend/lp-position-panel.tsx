'use client';

import { UsdcAmount } from '@/components/common/usdc-amount';
import { Skeleton } from '@/components/ui/skeleton';
import { useLpPosition } from '@/hooks/use-lend';

interface Props { wallet: string }

export function LpPositionPanel({ wallet }: Props) {
  const { data, isLoading } = useLpPosition(wallet);

  if (isLoading || !data) {
    return (
      <div className="card-base space-y-3">
        <Skeleton className="h-5 w-32 bg-bg-surface" />
        <Skeleton className="h-20 w-full bg-bg-surface" />
        <Skeleton className="h-16 w-full bg-bg-surface" />
      </div>
    );
  }

  const poolSharePct = (data.poolShareBps / 100).toFixed(2);

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Your LP Position</span>
        <span className="text-text-tertiary" style={{ fontSize: 12 }}>{poolSharePct}% of pool</span>
      </div>

      <div className="surface-base p-3 rounded-lg">
        <p className="text-text-tertiary mb-1" style={{ fontSize: 11 }}>Redemption value</p>
        <UsdcAmount raw={data.redemptionValue} className="font-mono font-semibold text-text-primary" style={{ fontSize: 24 } as React.CSSProperties} />
        <p className="text-text-tertiary mt-0.5" style={{ fontSize: 11 }}>
          deposited <UsdcAmount raw={data.totalDeposited} compact /> · earned <UsdcAmount raw={String(Number(data.redemptionValue) - Number(data.totalDeposited))} compact />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Net APY</p>
          <p className="font-mono font-semibold" style={{ fontSize: 16, color: 'var(--success)' }}>
            {(data.netApyBps / 100).toFixed(2)}%
          </p>
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily yield</p>
          <UsdcAmount raw={data.dailyYield} className="font-mono font-semibold text-text-primary" style={{ fontSize: 16 } as React.CSSProperties} />
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending yield</p>
          <UsdcAmount raw={data.pendingYield} className="font-mono font-semibold" style={{ fontSize: 16, color: 'var(--success)' } as React.CSSProperties} />
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Annual yield</p>
          <UsdcAmount raw={data.annualYield} compact className="font-mono font-semibold text-text-primary" style={{ fontSize: 16 } as React.CSSProperties} />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 py-2 rounded-lg font-medium text-white"
          style={{ background: 'var(--brand)', fontSize: 13 }}
        >
          Deposit
        </button>
        <button
          className="flex-1 py-2 rounded-lg font-medium"
          style={{ fontSize: 13, border: '0.5px solid var(--border)', color: 'var(--text-primary)', background: 'var(--bg-surface)' }}
        >
          Withdraw
        </button>
      </div>
    </div>
  );
}
