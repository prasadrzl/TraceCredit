'use client';

import { TierBadge } from '@/components/common/tier-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePositionStats } from '@/hooks/use-portfolio';

interface Props { wallet: string }

export function HealthCards({ wallet }: Props) {
  const { data, isLoading } = usePositionStats(wallet);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 bg-bg-surface rounded-xl" />)}
      </div>
    );
  }

  const creditUsedPct = (data.creditUsedBps / 100).toFixed(1);

  const cards = [
    {
      label: 'Reputation',
      value: (
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-text-primary" style={{ fontSize: 18 }}>{data.repScore}</span>
          <TierBadge tier={data.repTier} size="sm" />
        </div>
      ),
      sub: `${creditUsedPct}% credit used`,
    },
    {
      label: 'Health',
      value: <p className="font-semibold" style={{ fontSize: 18, color: 'var(--success)' }}>{data.health}</p>,
      sub: data.healthSub,
    },
    {
      label: 'Urgent',
      value: (
        <p className="font-semibold" style={{ fontSize: 18, color: data.urgentLoans > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
          {data.urgentLoans} loan{data.urgentLoans !== 1 ? 's' : ''}
        </p>
      ),
      sub: data.urgentSub,
    },
    {
      label: 'Limit upgrade',
      value: <p className="font-semibold text-text-primary" style={{ fontSize: 18 }}>{data.nextLimitDays}d</p>,
      sub: data.nextLimitSub,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="card-base space-y-1">
          <p className="text-text-tertiary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</p>
          {c.value}
          <p className="text-text-tertiary" style={{ fontSize: 11 }}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
