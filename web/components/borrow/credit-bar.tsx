'use client';

import { UsdcAmount } from '@/components/common/usdc-amount';
import { Skeleton } from '@/components/ui/skeleton';
import { useBorrowerProfile } from '@/hooks/use-borrow';

interface Props { wallet: string }

export function CreditBar({ wallet }: Props) {
  const { data, isLoading } = useBorrowerProfile(wallet);

  if (isLoading || !data) {
    return (
      <div className="card-base space-y-3">
        <Skeleton className="h-5 w-28 bg-bg-surface" />
        <Skeleton className="h-10 w-full bg-bg-surface" />
        <Skeleton className="h-2 w-full bg-bg-surface" />
      </div>
    );
  }

  const usedBps = Number(data.creditUsed) / Number(data.creditLimit);
  const usedPct = (usedBps * 100).toFixed(1);
  const rateLimitUsedBps = Number(data.rateLimitUsed) / Number(data.rateLimit24h);
  const resetHours = Math.floor(data.rateLimitResetSec / 3600);
  const resetMins  = Math.floor((data.rateLimitResetSec % 3600) / 60);

  return (
    <div className="card-base space-y-4">
      <span className="text-base font-medium text-text-primary">Credit Line</span>

      <div className="grid grid-cols-3 gap-3">
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Limit</p>
          <UsdcAmount raw={data.creditLimit} compact className="font-semibold text-text-primary" style={{ fontSize: 15 } as React.CSSProperties} />
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Used</p>
          <UsdcAmount raw={data.creditUsed} compact className="font-semibold" style={{ fontSize: 15, color: 'var(--warning)' } as React.CSSProperties} />
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available</p>
          <UsdcAmount raw={data.creditAvailable} compact className="font-semibold" style={{ fontSize: 15, color: 'var(--success)' } as React.CSSProperties} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-text-secondary" style={{ fontSize: 12 }}>Credit utilisation</span>
          <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>{usedPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-bg-surface overflow-hidden" style={{ border: '0.5px solid var(--border)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, Number(usedPct))}%`,
              background: Number(usedPct) > 80 ? 'var(--danger)' : Number(usedPct) > 60 ? 'var(--warning)' : 'var(--brand)',
            }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-text-secondary" style={{ fontSize: 12 }}>24h rate limit</span>
          <span className="font-mono text-text-tertiary" style={{ fontSize: 11 }}>
            resets in {resetHours}h {resetMins}m
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, rateLimitUsedBps * 100).toFixed(1)}%`,
              background: 'var(--text-tertiary)',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          <span>
            <UsdcAmount raw={data.rateLimitUsed} compact /> used
          </span>
          <span>
            <UsdcAmount raw={data.rateLimit24h} compact /> limit
          </span>
        </div>
      </div>
    </div>
  );
}
