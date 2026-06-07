'use client';

import { TierBadge } from '@/components/common/tier-badge';
import { ScoreGauge } from '@/components/common/score-gauge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRepScore, useScoreStats } from '@/hooks/use-reputation';

interface Props { wallet: string }

export function ScoreArcPanel({ wallet }: Props) {
  const { data: score, isLoading: sl } = useRepScore(wallet);
  const { data: stats, isLoading: tl } = useScoreStats(wallet);
  const isLoading = sl || tl;

  if (isLoading || !score) {
    return (
      <div className="card-base space-y-3">
        <Skeleton className="h-5 w-40 bg-bg-surface" />
        <div className="flex flex-col items-center">
          <Skeleton className="h-40 w-40 rounded-full bg-bg-surface" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 bg-bg-surface" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Reputation Score</span>
        <TierBadge tier={score.tier} />
      </div>

      <div className="flex flex-col items-center gap-1">
        <ScoreGauge score={score.score} size={160} />
        <p className="text-text-tertiary" style={{ fontSize: 12 }}>
          {score.ptsToNextTier} pts to {score.nextTier}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="surface-base p-2.5 rounded-lg text-center">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10 }}>30d change</p>
          <p className="font-mono font-semibold" style={{ fontSize: 15, color: (stats?.change30d ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {(stats?.change30d ?? 0) >= 0 ? '+' : ''}{stats?.change30d ?? 0}
          </p>
        </div>
        <div className="surface-base p-2.5 rounded-lg text-center">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10 }}>Peak score</p>
          <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 15 }}>{stats?.peakScore ?? '—'}</p>
        </div>
        <div className="surface-base p-2.5 rounded-lg text-center">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10 }}>Signals</p>
          <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 15 }}>{stats?.signalCount ?? '—'}</p>
        </div>
      </div>

      <div className="surface-base p-3 rounded-lg space-y-1.5">
        <div className="flex justify-between">
          <span className="text-text-tertiary" style={{ fontSize: 12 }}>Next tier: {score.nextTier}</span>
          <span className="font-mono text-text-secondary" style={{ fontSize: 12 }}>{score.score} / {score.nextTierScore}</span>
        </div>
        <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, (score.score / score.nextTierScore) * 100)}%`, background: 'var(--brand)' }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>Diamond: {score.ptsToDiamond} pts away</span>
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>{(score.rateAtDiamond / 100).toFixed(1)}% APR at Diamond</span>
        </div>
      </div>
    </div>
  );
}
