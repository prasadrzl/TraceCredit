'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useScoreHistory, useScoreStats, useRecentEvents } from '@/hooks/use-reputation';
import type { SignalType } from '@/types/reputation';

interface Props { wallet: string }

const EVENT_COLOR: Record<SignalType, string> = {
  repayment: 'var(--success)',
  dao:       'var(--brand)',
  cross:     'var(--tier-platinum)',
  late:      'var(--danger)',
  wallet:    'var(--text-secondary)',
  holdings:  'var(--text-secondary)',
  stake:     'var(--tier-gold)',
  decay:     'var(--text-tertiary)',
};

export function ScoreHistoryChart({ wallet }: Props) {
  const { data: history, isLoading: hl } = useScoreHistory(wallet);
  const { data: stats }                  = useScoreStats(wallet);
  const { data: events }                 = useRecentEvents(wallet);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLoading = hl;

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Score History</span>
        <div className="flex items-center gap-3 text-text-tertiary" style={{ fontSize: 11 }}>
          {stats && (
            <>
              <span className={stats.change30d >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                {stats.change30d >= 0 ? '+' : ''}{stats.change30d} (30d)
              </span>
              <span>Peak: {stats.peakScore}</span>
            </>
          )}
        </div>
      </div>

      {isLoading || !mounted || !history ? (
        <Skeleton className="h-44 w-full bg-bg-surface" />
      ) : (
        <ResponsiveContainer width="100%" height={176}>
          <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="0" strokeWidth={0.5} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
              domain={['dataMin - 50', 'dataMax + 50']}
              width={32}
            />
            <Tooltip
              formatter={(v: number) => [v, 'Score']}
              contentStyle={{
                fontSize: 12, borderRadius: 8, border: '0.5px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: 'none',
              }}
            />
            <Line
              type="monotone" dataKey="score"
              stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--brand)', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {events && events.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-text-tertiary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent events</p>
          {events.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: EVENT_COLOR[e.type] }} />
                <div className="min-w-0">
                  <p className="text-text-primary truncate" style={{ fontSize: 12 }}>{e.label}</p>
                  <p className="text-text-tertiary truncate" style={{ fontSize: 10 }}>{e.sub}</p>
                </div>
              </div>
              <div className="shrink-0 ml-2 text-right">
                <p className="font-mono font-medium" style={{ fontSize: 12, color: e.points > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {e.points > 0 ? '+' : ''}{e.points} pts
                </p>
                <p className="text-text-tertiary" style={{ fontSize: 10 }}>→ {e.score}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
