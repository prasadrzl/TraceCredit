'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useYieldChart7d } from '@/hooks/use-lend';

function fmtYield(raw: string): string {
  const val = Number(raw) / 1_000_000;
  return `$${val.toFixed(2)}`;
}

export function YieldChart() {
  const { data, isLoading } = useYieldChart7d();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = data?.map((d) => ({
    date: d.date.slice(5),
    yield: Number(d.dailyYield) / 1_000_000,
    raw: d.dailyYield,
  }));

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Daily Yield (7d)</span>
        <span className="text-text-tertiary" style={{ fontSize: 11 }}>LP yield · USDC</span>
      </div>

      {isLoading || !mounted || !chartData ? (
        <Skeleton className="h-44 w-full bg-bg-surface" />
      ) : (
        <ResponsiveContainer width="100%" height={176}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="0" strokeWidth={0.5} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `$${v.toFixed(2)}`}
              width={36}
            />
            <Tooltip
              formatter={(v: number) => [`$${v.toFixed(4)}`, 'Daily yield']}
              contentStyle={{
                fontSize: 12, borderRadius: 8, border: '0.5px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: 'none',
              }}
            />
            <Bar dataKey="yield" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
