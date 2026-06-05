'use client';

import { useEffect, useState } from 'react';
import { useMarketVolume } from '@/hooks/use-markets';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';

function fmtK(v: number): string {
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function fmtUsd(v: number): string {
  return `$${(v / 1_000_000).toFixed(2)}M`;
}

export function BorrowVolumeChart() {
  const { data, isLoading } = useMarketVolume();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = (data ?? []).map((d) => ({
    date:   format(parseISO(d.date), 'MMM d'),
    borrow: Math.round(Number(d.borrowVolume) / 1_000_000),
    repay:  Math.round(Number(d.repayVolume)  / 1_000_000),
  }));

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-medium text-text-primary">Borrow &amp; Repay Volume</p>
          <div className="flex items-center gap-3 mt-1">
            <LegendDot color="var(--brand)"   label="Borrow" />
            <LegendDot color="var(--success)" label="Repay"  />
          </div>
        </div>
        <span className="text-text-tertiary" style={{ fontSize: 11 }}>USDC · 7 days</span>
      </div>

      {isLoading || !mounted ? (
        <Skeleton className="h-52 w-full bg-bg-surface" />
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={chartData} barGap={3} barCategoryGap="35%" margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" strokeWidth={0.5} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={40} />
            <Tooltip
              formatter={(v: number, name: string) => [fmtUsd(v * 1_000_000), name === 'borrow' ? 'Borrow' : 'Repay']}
              labelStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: 'none' }}
              cursor={{ fill: 'var(--bg-surface)', opacity: 0.7 }}
            />
            <Bar dataKey="borrow" fill="var(--chart-borrow)" radius={[3,3,0,0]} />
            <Bar dataKey="repay"  fill="var(--chart-repay)"  radius={[3,3,0,0]} />
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
