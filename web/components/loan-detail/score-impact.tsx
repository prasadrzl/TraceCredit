'use client';

import type { ScoreImpactDetail } from '@/types/loan-detail';

const TIER_COLORS: Record<string, string> = {
  Diamond: '#534AB7', Platinum: '#378ADD', Gold: '#EF9F27', Silver: '#B4B2A9', Bronze: '#D85A30',
};

interface Props { impact: ScoreImpactDetail }

export function ScoreImpactCard({ impact }: Props) {
  const currentTierColor = TIER_COLORS[impact.currentTier] ?? '#999';
  const nextTierColor    = TIER_COLORS[impact.nextTier]    ?? '#999';
  const range = impact.nextTierScore - impact.currentTierScore;
  const progressPct = range > 0 ? Math.min(((impact.currentScore - impact.currentTierScore) / range) * 100, 100) : 100;

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12 }}>☆</span>
          <span className="font-semibold text-text-primary" style={{ fontSize: 14 }}>Score impact</span>
        </div>
        <span className="text-text-tertiary" style={{ fontSize: 11 }}>on full repayment</span>
      </div>

      {/* Projection banner */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'var(--success-subtle)', border: '0.5px solid var(--success)' }}>
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--success)', fontSize: 14 }}>↗</span>
          <div>
            <p className="font-medium text-text-primary" style={{ fontSize: 13 }}>
              <strong>On-time repayment</strong> projection
            </p>
            <p className="text-text-tertiary" style={{ fontSize: 11 }}>Log-scaled · {impact.repaymentNumber}th repayment</p>
          </div>
        </div>
        <span className="font-mono font-bold" style={{ fontSize: 16, color: 'var(--success)' }}>
          +{impact.projectedPoints} pts
        </span>
      </div>

      {/* Tier progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-medium" style={{ fontSize: 11, color: currentTierColor }}>
            ● {impact.currentTier} · {impact.currentTierScore}
          </span>
          <span className="font-medium" style={{ fontSize: 11, color: nextTierColor }}>
            {impact.nextTier} · {impact.nextTierScore} ●
          </span>
        </div>
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${currentTierColor}, ${nextTierColor})` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>current: {impact.currentScore}</span>
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>-{impact.ptsToNextTier} pts to {impact.nextTier}</span>
        </div>
      </div>
    </div>
  );
}
