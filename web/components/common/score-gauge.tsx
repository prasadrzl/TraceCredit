'use client';

import { TIER_COLOURS, scoreToTier } from '@/lib/utils/tiers';

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 160 }: ScoreGaugeProps) {
  const tier = scoreToTier(score);
  const colour = TIER_COLOURS[tier];

  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const progress = score / 1000;
  const angle = startAngle + totalAngle * progress;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (start: number, end: number, r: number) => {
    const s = { x: cx + r * Math.cos(toRad(start)), y: cy + r * Math.sin(toRad(start)) };
    const e = { x: cx + r * Math.cos(toRad(end)), y: cy + r * Math.sin(toRad(end)) };
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <path
        d={arcPath(startAngle, endAngle, radius)}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={size * 0.06}
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={arcPath(startAngle, angle, radius)}
        fill="none"
        stroke={colour}
        strokeWidth={size * 0.06}
        strokeLinecap="round"
      />
      {/* Score label */}
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={size * 0.22} fontWeight="600" fill="currentColor">
        {score}
      </text>
      <text x={cx} y={cy + size * 0.16} textAnchor="middle" fontSize={size * 0.08} fill="hsl(var(--muted-foreground))">
        out of 1000
      </text>
    </svg>
  );
}
