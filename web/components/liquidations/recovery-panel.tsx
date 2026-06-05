'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { RecoveryBreakdown } from '@/types/liquidation';

function fmt(n: number) {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

interface Props { breakdown: RecoveryBreakdown }

export function RecoveryPanel({ breakdown }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = [
    { name: 'Recovered',   value: breakdown.recovered,   color: '#22c55e' },
    { name: 'Written off', value: breakdown.writtenOff,   color: '#ef4444' },
  ];

  return (
    <div className="card-base">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12 }}>⊙</span>
          <span className="font-medium text-text-primary" style={{ fontSize: 13 }}>Recovery breakdown</span>
        </div>
        <span className="text-text-tertiary" style={{ fontSize: 11 }}>all time · {fmt(breakdown.total)}</span>
      </div>

      {mounted ? (
        <div className="flex items-center justify-center my-2" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={72} dataKey="value" strokeWidth={0}>
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-tertiary)" style={{ fontSize: 11 }}>RECOVERY RATE</text>
              <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" fontWeight={700} style={{ fontSize: 18 }}>
                {Math.round((breakdown.recovered / breakdown.total) * 100)}%
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--bg-surface)' }} />
      )}

      <div className="space-y-2 mt-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
              <span className="text-text-secondary" style={{ fontSize: 12 }}>{d.name}</span>
            </div>
            <span className="font-mono font-semibold text-text-primary" style={{ fontSize: 12 }}>{fmt(d.value)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1" style={{ borderTop: '0.5px solid var(--border)' }}>
          <span className="text-text-tertiary" style={{ fontSize: 12 }}>Total principal</span>
          <span className="font-mono text-text-secondary" style={{ fontSize: 12 }}>{fmt(breakdown.total)}</span>
        </div>
      </div>
    </div>
  );
}
