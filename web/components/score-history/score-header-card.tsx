'use client';

import type { ScoreHeader } from '@/types/score-history';
import { ScoreGauge } from '@/components/common/score-gauge';
import { TierBadge } from '@/components/common/tier-badge';

interface Props { header: ScoreHeader }

export function ScoreHeaderCard({ header }: Props) {
  return (
    <div className="card-base">
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Gauge */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <ScoreGauge score={header.score} size={140} />
          <p className="text-text-tertiary" style={{ fontSize: 11 }}>of {header.maxScore}</p>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-text-tertiary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CURRENT SCORE</span>
            <TierBadge tier={header.tier} size="sm" />
            <span className="px-2 py-0.5 rounded-full font-medium" style={{ fontSize: 11, background: 'var(--success-subtle)', color: 'var(--success)' }}>
              ↗ +{header.changePoints30d} pts · last 30 days
            </span>
          </div>

          <p className="text-text-secondary" style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 520 }}>{header.description}</p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-text-tertiary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Positive signals · 30D</p>
              <p className="font-mono font-bold mt-1" style={{ fontSize: 18, color: 'var(--success)' }}>+{header.positiveSignals30d} pts</p>
            </div>
            <div>
              <p className="text-text-tertiary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Penalties · 30D</p>
              <p className="font-mono font-bold mt-1" style={{ fontSize: 18, color: 'var(--danger)' }}>{header.penalties30d} pts</p>
            </div>
            <div>
              <p className="text-text-tertiary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Next tier</p>
              <p className="font-mono font-bold mt-1 text-text-primary" style={{ fontSize: 18 }}>{header.nextTier} · {header.nextTierScore}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
