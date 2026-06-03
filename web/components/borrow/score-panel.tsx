'use client';

import { ScoreGauge } from '@/components/common/score-gauge';
import { TierBadge } from '@/components/common/tier-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBorrowerProfile } from '@/hooks/use-borrow';

interface Props { wallet: string }

export function ScorePanel({ wallet }: Props) {
  const { data, isLoading } = useBorrowerProfile(wallet);

  if (isLoading || !data) {
    return (
      <div className="card-base space-y-4">
        <Skeleton className="h-5 w-32 bg-bg-surface" />
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-40 w-40 rounded-full bg-bg-surface" />
          <Skeleton className="h-4 w-24 bg-bg-surface" />
        </div>
      </div>
    );
  }

  const ptsLeft = data.scoreToNextTier;

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Reputation Score</span>
        <TierBadge tier={data.tier} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <ScoreGauge score={data.score} size={152} />
        <p className="text-text-tertiary" style={{ fontSize: 12 }}>
          {ptsLeft} pts to {data.nextTier}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current APR</p>
          <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 15 }}>
            {(data.interestRateBps / 100).toFixed(1)}%
          </p>
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{data.nextTier} APR</p>
          <p className="font-mono font-semibold" style={{ fontSize: 15, color: 'var(--brand)' }}>
            {(data.nextTierRateBps / 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="surface-base p-2.5 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>Next tier: {data.nextTier}</span>
          <span className="text-text-tertiary font-mono" style={{ fontSize: 11 }}>{data.score} / {data.nextTierScore}</span>
        </div>
        <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, (data.score / data.nextTierScore) * 100)}%`,
              background: 'var(--brand)',
            }}
          />
        </div>
        <p className="text-text-tertiary mt-1" style={{ fontSize: 10 }}>
          {data.nextTierCreditLimit !== data.creditLimit
            ? `Unlocks $${Number(data.nextTierCreditLimit) / 1_000_000}M credit limit`
            : `${data.scoreToNextTier} pts remaining`
          }
        </p>
      </div>
    </div>
  );
}
