'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';
import { useActivityStore } from '@/store/activity-store';
import { cn } from '@/lib/utils/cn';
import type { ActivityItem } from '@/types/dashboard';
import mock from '@/lib/mock/dashboard.json';

const TYPE_CONFIG = {
  borrow: {
    icon:   <ArrowDownLeft className="h-3.5 w-3.5" />,
    iconBg: 'var(--brand-subtle)',
    iconFg: 'var(--brand)',
    label:  'Borrowed',
  },
  repaid: {
    icon:   <ArrowUpRight className="h-3.5 w-3.5" />,
    iconBg: 'var(--success-subtle)',
    iconFg: 'var(--success)',
    label:  'Repaid',
  },
  liquidation: {
    icon:   <ArrowDownLeft className="h-3.5 w-3.5" />,
    iconBg: 'var(--danger-subtle)',
    iconFg: 'var(--danger-hover)',
    label:  'Liquidation',
  },
  deposit: {
    icon:   <ArrowDownLeft className="h-3.5 w-3.5" />,
    iconBg: '#E6F1FB',
    iconFg: '#185FA5',
    label:  'LP deposit',
  },
  score: {
    icon:   <ArrowUpRight className="h-3.5 w-3.5" />,
    iconBg: 'var(--warning-subtle)',
    iconFg: 'var(--warning)',
    label:  'Score',
  },
} as const;

const TIER_COLOURS: Record<string, string> = {
  Diamond:  'var(--tier-diamond)',
  Platinum: 'var(--tier-platinum)',
  Gold:     'var(--tier-gold)',
  Silver:   'var(--tier-silver)',
  Bronze:   'var(--tier-bronze)',
};

function fmtUsdc(raw: string): string {
  const n = Number(raw) / 1_000_000;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDC`;
}

function timeLabel(offsetSec: number): string {
  const abs = Math.abs(offsetSec);
  if (abs === 0) return 'just now';
  if (abs < 60)  return `${abs}s ago`;
  return `${Math.floor(abs / 60)}m ago`;
}

function ActivityRow({ item, isNew }: { item: ActivityItem; isNew?: boolean }) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.borrow;
  const tierCol = item.tier ? TIER_COLOURS[item.tier] : undefined;

  return (
    <div className={cn(
      'flex items-center justify-between gap-3 py-2.5',
      isNew && 'animate-fade-in-down',
    )}>
      {/* Icon */}
      <div
        className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: cfg.iconBg, color: cfg.iconFg }}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-text-primary font-medium" style={{ fontSize: 13 }}>
            {cfg.label}
          </span>
          {item.amount && (
            <span className="font-mono text-text-primary" style={{ fontSize: 13 }}>
              {fmtUsdc(item.amount)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {tierCol && (
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: tierCol }}
            />
          )}
          {item.tier && (
            <span style={{ fontSize: 11, color: tierCol }}>{item.tier}</span>
          )}
          <span className="font-mono text-text-tertiary" style={{ fontSize: 11 }}>
            {item.wallet}
          </span>
        </div>
      </div>

      {/* Time */}
      <span className="text-text-tertiary flex-shrink-0" style={{ fontSize: 11 }}>
        {timeLabel(item.ts)}
      </span>
    </div>
  );
}

export function LiveActivityFeed() {
  const wsActivities = useActivityStore((s) => s.activities);

  // seed with mock data on first render; real WS events prepend above
  const [seedItems] = useState<ActivityItem[]>(
    () => mock.recentActivity as ActivityItem[]
  );

  const merged: ActivityItem[] = [
    ...(wsActivities as unknown as ActivityItem[]),
    ...seedItems,
  ].slice(0, 20);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const newIds = useRef(new Set<string>());
  useEffect(() => {
    wsActivities.forEach(a => newIds.current.add(a.id));
  }, [wsActivities]);

  return (
    <div className="card-base flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-text-primary">Live Activity</span>
          <div className="flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--success)]" />
            </span>
            <span style={{ fontSize: 11 }} className="text-text-tertiary">real-time</span>
          </div>
        </div>
        <button className="h-7 w-7 flex items-center justify-center rounded-md border border-[var(--border)] hover:bg-bg-surface transition-colors">
          <Filter className="h-3 w-3 text-text-tertiary" />
        </button>
      </div>

      {/* Feed */}
      <div className="divide-y divide-[var(--border-soft)] overflow-y-auto max-h-[520px] -mx-1 px-1">
        {merged.map((item, i) => (
          <ActivityRow
            key={`${item.id}-${tick}`}
            item={item}
            isNew={newIds.current.has(item.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="pt-3 mt-2 border-t border-[var(--border-soft)]">
        <button className="w-full text-center text-xs text-brand hover:text-brand-hover transition-colors py-1">
          View all activity ↗
        </button>
      </div>
    </div>
  );
}
