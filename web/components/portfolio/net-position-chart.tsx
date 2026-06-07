'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useNetPositionChart } from '@/hooks/use-portfolio';

interface Props { wallet: string }

export function NetPositionChart({ wallet }: Props) {
  const { data, isLoading } = useNetPositionChart(wallet);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Net Position (30d)</span>
        <span className="text-text-tertiary" style={{ fontSize: 11 }}>USDC · thousands</span>
      </div>

      {isLoading || !mounted || !data ? (
        <Skeleton className="h-44 w-full bg-bg-surface" />
      ) : (
        <ResponsiveContainer width="100%" height={176}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--brand)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--brand)" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="lpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--success)" stopOpacity={0.10} />
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="0" strokeWidth={0.5} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `$${v}k`}
              width={36}
            />
            <Tooltip
              formatter={(v: number, name: string) => [`$${v}k`, name === 'net' ? 'Net' : name === 'lp' ? 'LP' : 'Debt']}
              contentStyle={{
                fontSize: 12, borderRadius: 8, border: '0.5px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: 'none',
              }}
            />
            <Area type="monotone" dataKey="lp"   stroke="var(--success)" strokeWidth={1.5} fill="url(#lpGrad)"  dot={false} />
            <Area type="monotone" dataKey="debt" stroke="var(--danger)"  strokeWidth={1.5} fill="none"          dot={false} />
            <Area type="monotone" dataKey="net"  stroke="var(--brand)"   strokeWidth={2}   fill="url(#netGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center gap-4" style={{ fontSize: 11 }}>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: 'var(--brand)' }} />
          <span className="text-text-secondary">Net</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: 'var(--success)' }} />
          <span className="text-text-secondary">LP value</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: 'var(--danger)' }} />
          <span className="text-text-secondary">Debt</span>
        </div>
      </div>
    </div>
  );
}
