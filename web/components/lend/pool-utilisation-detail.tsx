'use client';

import { UsdcAmount } from '@/components/common/usdc-amount';
import { Skeleton } from '@/components/ui/skeleton';
import { usePoolUtilisation, useApyBreakdown } from '@/hooks/use-lend';

export function PoolUtilisationDetail() {
  const { data: util, isLoading: ul } = usePoolUtilisation();
  const { data: apy,  isLoading: al } = useApyBreakdown();
  const isLoading = ul || al;

  if (isLoading || !util || !apy) {
    return (
      <div className="card-base space-y-3">
        <Skeleton className="h-5 w-40 bg-bg-surface" />
        <Skeleton className="h-2 w-full bg-bg-surface" />
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 bg-bg-surface" />)}
        </div>
      </div>
    );
  }

  const currentPct = (util.currentUtilBps / 100).toFixed(1);
  const kinkPct    = util.kinkBps / 100;
  const capPct     = util.capBps  / 100;

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Pool Utilisation</span>
        <span className="font-mono font-medium text-text-primary" style={{ fontSize: 14 }}>{currentPct}%</span>
      </div>

      <div>
        <div className="relative h-2.5 w-full rounded-full bg-bg-surface overflow-visible" style={{ border: '0.5px solid var(--border)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${currentPct}%`, background: 'var(--brand)' }}
          />
          <div className="absolute top-[-4px] bottom-[-4px] w-px" style={{ left: `${kinkPct}%`, background: 'var(--warning)' }} />
          <div className="absolute top-[-4px] bottom-[-4px] w-px" style={{ left: `${capPct}%`,  background: 'var(--danger)'  }} />
        </div>
        <div className="relative h-5 mt-1" style={{ fontSize: 10 }}>
          <span className="absolute" style={{ left: `calc(${kinkPct}% - 20px)`, color: 'var(--warning)', fontWeight: 500 }}>
            {kinkPct}% kink
          </span>
          <span className="absolute" style={{ left: `calc(${capPct}% - 16px)`, color: 'var(--danger)', fontWeight: 500 }}>
            {capPct}% cap
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Borrow APR</p>
          <p className="font-mono font-medium text-text-primary" style={{ fontSize: 15 }}>{(util.currentBorrowAprBps / 100).toFixed(1)}%</p>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>Gold tier</p>
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gross APY</p>
          <p className="font-mono font-medium text-text-primary" style={{ fontSize: 15 }}>{(util.grossPoolApyBps / 100).toFixed(2)}%</p>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>pool earned</p>
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reserve</p>
          <UsdcAmount raw={util.reserveBalance} compact className="font-mono font-medium text-text-primary" style={{ fontSize: 15 } as React.CSSProperties} />
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>{(util.reserveFactorBps / 100).toFixed(0)}% factor</p>
        </div>
      </div>

      {util.currentUtilBps >= util.atKinkWarningBps && (
        <div className="rounded-lg p-2.5" style={{ background: 'var(--warning-subtle)', border: '0.5px solid var(--warning)' }}>
          <p style={{ fontSize: 12, color: 'var(--warning)' }}>
            Utilisation approaching kink — above-kink rates may apply soon
          </p>
        </div>
      )}
    </div>
  );
}
