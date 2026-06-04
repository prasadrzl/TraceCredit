'use client';

import { useEffect, useState } from 'react';
import { usePoolDepthCurve, usePoolDepthStats } from '@/hooks/use-markets';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

function fmtApr(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

export function PoolDepthChart() {
  const { data: curve, isLoading: cl } = usePoolDepthCurve();
  const { data: stats, isLoading: sl } = usePoolDepthStats();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLoading = cl || sl;
  const currentUtil = stats ? stats.currentUtilBps / 100 : 40;
  const kinkPct     = stats ? stats.kinkBps / 100 : 70;
  const capPct      = stats ? stats.capBps  / 100 : 90;

  // Find current APR from below-kink curve
  const currentPoint = curve?.find((p) => p.utilPct === Math.floor(currentUtil / 10) * 10);
  const currentApr   = currentPoint?.belowKink ?? (stats ? stats.belowKinkAprBps / 100 : 8.8);

  return (
    <div className="card-base space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Pool Depth &amp; Interest Rate</span>
        <span className="text-text-tertiary" style={{ fontSize: 11 }}>USDC · Base</span>
      </div>

      {/* Utilisation bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-text-secondary" style={{ fontSize: 12 }}>Utilisation</span>
          <span className="font-mono font-medium text-text-primary" style={{ fontSize: 13 }}>{currentUtil.toFixed(1)}%</span>
        </div>
        <div className="relative h-2 w-full rounded-full bg-bg-surface overflow-visible" style={{ border: '0.5px solid var(--border)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${currentUtil}%`, background: 'var(--brand)' }}
          />
          <div className="absolute top-[-3px] bottom-[-3px] w-px" style={{ left: `${kinkPct}%`, background: 'var(--warning)' }} />
          <div className="absolute top-[-3px] bottom-[-3px] w-px" style={{ left: `${capPct}%`, background: 'var(--danger)'  }} />
        </div>
        <div className="relative h-4 mt-1" style={{ fontSize: 10 }}>
          <span className="absolute" style={{ left: `calc(${kinkPct}% - 20px)`, color: 'var(--warning)', fontWeight: 500 }}>
            {kinkPct}% kink
          </span>
          <span className="absolute" style={{ left: `calc(${capPct}% - 16px)`, color: 'var(--danger)', fontWeight: 500 }}>
            {capPct}% cap
          </span>
        </div>
      </div>

      {/* Rate curve chart */}
      {isLoading || !mounted ? (
        <Skeleton className="h-44 w-full bg-bg-surface" />
      ) : (
        <ResponsiveContainer width="100%" height={175}>
          <LineChart data={curve ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="0" strokeWidth={0.5} />
            <XAxis
              dataKey="utilPct"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v}%`}
              ticks={[0, 25, 50, 70, 90]}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              width={34}
            />
            <Tooltip
              formatter={(v, name) =>
                v == null ? null : [`${Number(v).toFixed(1)}%`, name === 'belowKink' ? 'Below kink' : 'Above kink']
              }
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: 'none' }}
            />
            <ReferenceLine x={kinkPct} stroke="var(--warning)" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine x={capPct}  stroke="var(--danger)"  strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceDot x={currentUtil} y={currentApr} r={5} fill="var(--brand)" stroke="var(--bg-card)" strokeWidth={2} />
            <Line
              type="monotone" dataKey="belowKink" name="belowKink"
              stroke="var(--brand)" strokeWidth={2} dot={false} connectNulls={false}
            />
            <Line
              type="monotone" dataKey="aboveKink" name="aboveKink"
              stroke="var(--tier-gold)" strokeWidth={2} dot={false} connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4" style={{ fontSize: 11 }}>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--brand)' }} />
          <span className="text-text-secondary">Below kink</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--tier-gold)' }} />
          <span className="text-text-secondary">Above kink (jump)</span>
        </div>
        <span className="ml-auto text-text-tertiary">APR vs Utilisation</span>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="surface-base p-2.5">
            <p className="text-text-tertiary mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Below kink (now)</p>
            <p className="font-mono font-medium text-text-primary" style={{ fontSize: 15 }}>{fmtApr(stats.belowKinkAprBps)}</p>
            <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>Gold tier · {currentUtil.toFixed(0)}% util</p>
          </div>
          <div className="surface-base p-2.5">
            <p className="text-text-tertiary mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Above kink</p>
            <p className="font-mono font-medium" style={{ fontSize: 15, color: 'var(--warning)' }}>
              {fmtApr(stats.aboveKinkMinBps)}–{fmtApr(stats.aboveKinkMaxBps)}
            </p>
            <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>jump multiplier fires</p>
          </div>
          <div className="surface-base p-2.5">
            <p className="text-text-tertiary mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>LP net APY</p>
            <p className="font-mono font-medium" style={{ fontSize: 15, color: 'var(--success)' }}>{fmtApr(stats.lpNetApyBps)}</p>
            <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>after {(stats.reserveFactorBps / 100).toFixed(0)}% reserve cut</p>
          </div>
        </div>
      )}
    </div>
  );
}
