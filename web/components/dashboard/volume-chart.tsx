'use client';

import { useState, useEffect } from 'react';
import { useVolumeChart } from '@/hooks/use-dashboard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import { format, parseISO } from 'date-fns';

type Range = 7 | 30 | 90;

const RANGES: { label: string; value: Range }[] = [
  { label: '7D',  value: 7  },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

function fmtK(v: number): string {
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(Math.round(v));
}

function fmtUsd(v: number): string {
  return `$${(v / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function VolumeChart() {
  const [range, setRange] = useState<Range>(7);
  const [mounted, setMounted] = useState(false);
  const { data, isLoading } = useVolumeChart(range);

  useEffect(() => setMounted(true), []);

  const chartData = (data ?? []).map((d) => {
    const parsed = parseISO(d.date);
    return {
      date:   range === 7 ? format(parsed, 'MMM d') : format(parsed, 'M/d'),
      borrow: Math.round(Number(d.borrowVolume) / 1_000_000),
      repay:  Math.round(Number(d.repayVolume)  / 1_000_000),
    };
  });

  return (
    <div className="card-base space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-medium text-text-primary">Borrow vs Repay Volume</p>
          <div className="flex items-center gap-3 mt-1.5">
            <LegendDot color="var(--brand)" label="Borrow" />
            <LegendDot color="var(--success)" label="Repay" />
          </div>
        </div>
        <div className="flex items-center rounded-md overflow-hidden border border-[var(--border)]">
          {RANGES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                range === value
                  ? 'bg-brand-subtle text-brand'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart — rendered client-only to avoid recharts ResizeObserver hydration mismatch */}
      {isLoading || !mounted ? (
        <Skeleton className="h-52 w-full bg-bg-surface" />
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={chartData} barGap={3} barCategoryGap="35%" margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="0"
              strokeWidth={0.5}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              interval={range === 7 ? 0 : 'preserveStartEnd'}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmtK}
              width={36}
            />
            <Tooltip
              formatter={(v: number, name: string) => [fmtUsd(v * 1_000_000), name === 'borrow' ? 'Borrow' : 'Repay']}
              labelStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '0.5px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                boxShadow: 'none',
              }}
              cursor={{ fill: 'var(--bg-surface)', opacity: 0.7 }}
            />
            <Bar dataKey="borrow" name="borrow" fill="var(--chart-borrow)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="repay"  name="repay"  fill="var(--chart-repay)"  radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ background: color }} />
      <span className="text-text-tertiary" style={{ fontSize: 11 }}>{label}</span>
    </div>
  );
}
