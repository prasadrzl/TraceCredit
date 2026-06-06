'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { ScoreTrendPoint } from '@/types/score-history';

const RANGES = ['7d', '30d', '90d', 'all'] as const;
type Range = typeof RANGES[number];

interface Props { data: ScoreTrendPoint[] }

export function ScoreTrendChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<Range>('30d');
  useEffect(() => setMounted(true), []);

  const sliced = range === '7d' ? data.slice(-7)
    : range === '90d' ? data
    : range === 'all' ? data
    : data;

  const minScore = Math.min(...sliced.map(d => d.score)) - 10;
  const maxScore = Math.max(...sliced.map(d => d.score)) + 10;

  return (
    <div className="card-base">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12 }}>↗</span>
          <span className="font-medium text-text-primary" style={{ fontSize: 13 }}>Score trend</span>
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>30-day movement</span>
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="px-2.5 py-1 rounded-md transition-colors"
              style={{ fontSize: 11, fontWeight: range === r ? 600 : 400, background: range === r ? 'var(--brand)' : 'transparent', color: range === r ? '#fff' : 'var(--text-secondary)', border: range === r ? 'none' : '0.5px solid var(--border)' }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {mounted ? (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={sliced} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[minScore, maxScore]} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--text-tertiary)' }}
              itemStyle={{ color: 'var(--brand)' }}
            />
            <Area type="monotone" dataKey="score" stroke="var(--brand)" strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-36 rounded-xl animate-pulse" style={{ background: 'var(--bg-surface)' }} />
      )}
    </div>
  );
}
