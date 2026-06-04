'use client';

import { UsdcAmount } from '@/components/common/usdc-amount';
import { Skeleton } from '@/components/ui/skeleton';
import { usePoolStats, useApyBreakdown } from '@/hooks/use-lend';

export function LendStatCards() {
  const { data: pool, isLoading: pl } = usePoolStats();
  const { data: apy, isLoading: al } = useApyBreakdown();
  const isLoading = pl || al;

  const cards = [
    {
      label: 'Total Value Locked',
      value: pool ? <UsdcAmount raw={pool.tvl} compact className="font-mono font-semibold text-text-primary" style={{ fontSize: 18 } as React.CSSProperties} /> : null,
      sub: pool ? `${pool.sharesOutstanding ? (Number(pool.sharesOutstanding) / 1e12).toFixed(1) + 'T shares outstanding' : ''}` : '',
    },
    {
      label: 'Net LP APY',
      value: pool ? (
        <p className="font-mono font-semibold" style={{ fontSize: 18, color: 'var(--success)' }}>
          {(pool.netLpApyBps / 100).toFixed(2)}%
        </p>
      ) : null,
      sub: apy ? `after ${(apy.reserveCutBps / 100).toFixed(0)}% reserve cut` : '',
    },
    {
      label: 'Pool Utilisation',
      value: pool ? (
        <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 18 }}>
          {(pool.utilisationBps / 100).toFixed(1)}%
        </p>
      ) : null,
      sub: pool ? `kink at ${(pool.kinkBps / 100).toFixed(0)}%` : '',
    },
    {
      label: 'Share Price',
      value: pool ? (
        <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 18 }}>
          ${(Number(pool.sharePrice) / 1_000_000).toFixed(4)}
        </p>
      ) : null,
      sub: pool ? `+${(pool.sharePriceDeltaBps / 100).toFixed(2)}% all-time` : '',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="card-base space-y-1">
          <p className="text-text-tertiary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</p>
          {isLoading ? (
            <Skeleton className="h-7 w-24 bg-bg-surface" />
          ) : (
            c.value
          )}
          {isLoading ? (
            <Skeleton className="h-3 w-20 bg-bg-surface" />
          ) : (
            <p className="text-text-tertiary" style={{ fontSize: 11 }}>{c.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
