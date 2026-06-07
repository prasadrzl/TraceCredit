'use client';

import { UsdcAmount } from '@/components/common/usdc-amount';
import { TierBadge } from '@/components/common/tier-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRepCreditSnapshot } from '@/hooks/use-reputation';

interface Props { wallet: string }

export function CreditSnapshot({ wallet }: Props) {
  const { data, isLoading } = useRepCreditSnapshot(wallet);

  if (isLoading || !data) {
    return (
      <div className="card-base space-y-3">
        <Skeleton className="h-5 w-36 bg-bg-surface" />
        <Skeleton className="h-2 w-full bg-bg-surface" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 bg-bg-surface" />)}
        </div>
      </div>
    );
  }

  const usedBps = Number(data.creditUsed) / Number(data.creditLimit);

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Credit Snapshot</span>
        <TierBadge tier={data.tier} />
      </div>

      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-text-secondary" style={{ fontSize: 12 }}>Credit utilisation</span>
          <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>
            <UsdcAmount raw={data.creditUsed} compact /> / <UsdcAmount raw={data.creditLimit} compact />
          </span>
        </div>
        <div className="h-2 rounded-full bg-bg-surface overflow-hidden" style={{ border: '0.5px solid var(--border)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, usedBps * 100)}%`,
              background: usedBps > 0.8 ? 'var(--danger)' : usedBps > 0.6 ? 'var(--warning)' : 'var(--brand)',
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>APR</p>
          <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 15 }}>
            {(data.interestRateBps / 100).toFixed(1)}%
          </p>
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available</p>
          <UsdcAmount raw={data.creditAvailable} compact className="font-mono font-semibold" style={{ fontSize: 15, color: 'var(--success)' } as React.CSSProperties} />
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active loans</p>
          <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 15 }}>{data.activeLoans}</p>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>{data.loansRepaid} repaid · {data.defaults} defaults</p>
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Limit review</p>
          <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 15 }}>{data.limitIncreaseDays}d</p>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>last activity {data.lastActivityDaysAgo}d ago</p>
        </div>
      </div>

      <div className="surface-base p-2.5 rounded-lg space-y-1">
        <p className="text-text-tertiary font-medium" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>SBT Protection</p>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary" style={{ fontSize: 12 }}>Guardian</span>
          <span className="text-text-primary font-mono" style={{ fontSize: 12 }}>{data.sbtProtection.guardianSet}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary" style={{ fontSize: 12 }}>Stake vault</span>
          <span className="text-text-primary font-mono" style={{ fontSize: 12 }}>{data.sbtProtection.stakeVault}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary" style={{ fontSize: 12 }}>Unlock delay</span>
          <span className="text-text-primary font-mono" style={{ fontSize: 12 }}>{data.sbtProtection.unlockDelay}</span>
        </div>
      </div>
    </div>
  );
}
