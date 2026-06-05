'use client';

import { useState } from 'react';
import { useRecentBorrows } from '@/hooks/use-markets';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import type { LoanState } from '@/types/markets';

const TIER_COLOURS: Record<string, string> = {
  Diamond:  'var(--tier-diamond)',
  Platinum: 'var(--tier-platinum)',
  Gold:     'var(--tier-gold)',
  Silver:   'var(--tier-silver)',
  Bronze:   'var(--tier-bronze)',
};

const STATE_STYLE: Record<LoanState, { label: string; bg: string; text: string }> = {
  Active:      { label: 'Active',       bg: 'var(--success-subtle)',  text: 'var(--success)'  },
  GracePeriod: { label: 'Grace period', bg: 'var(--warning-subtle)',  text: 'var(--warning)'  },
  Repaid:      { label: 'Repaid',       bg: 'var(--success-subtle)',  text: 'var(--success)'  },
  Defaulted:   { label: 'Defaulted',    bg: 'var(--danger-subtle)',   text: 'var(--danger)'   },
  WrittenOff:  { label: 'Written off',  bg: 'var(--danger-subtle)',   text: 'var(--danger)'   },
};

type Filter = 'All' | 'Active' | 'GracePeriod' | 'Repaid';
const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All',          value: 'All'         },
  { label: 'Active',       value: 'Active'      },
  { label: 'Grace period', value: 'GracePeriod' },
  { label: 'Repaid',       value: 'Repaid'      },
];

function fmtUsdc(raw: string): string {
  const n = Number(raw) / 1_000_000;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentBorrowsTable() {
  const { data, isLoading } = useRecentBorrows();
  const [filter, setFilter] = useState<Filter>('All');

  const rows = (data ?? []).filter(
    (r) => filter === 'All' || r.state === filter,
  );

  return (
    <div className="card-base">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-base font-medium text-text-primary">Recent Borrows</span>
        <div className="flex items-center rounded-md overflow-hidden border border-[var(--border)]">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                filter === value
                  ? 'bg-brand-subtle text-brand'
                  : 'text-text-secondary hover:bg-bg-surface',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_1fr_100px_90px_55px_100px_80px] gap-2 mb-2">
        {['LOAN','BORROWER','TIER','PRINCIPAL','APR','STATE','DEADLINE'].map((h) => (
          <span key={h} className="text-text-tertiary" style={{ fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-8 bg-bg-surface" />)}
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-soft)]">
          {rows.map((row) => {
            const ss = STATE_STYLE[row.state] ?? STATE_STYLE.Active;
            const tierCol = TIER_COLOURS[row.tier] ?? 'var(--text-tertiary)';
            return (
              <div key={row.loanId} className="grid grid-cols-[40px_1fr_100px_90px_55px_100px_80px] gap-2 items-center py-2.5">
                {/* Loan ID */}
                <span className="font-mono text-text-tertiary" style={{ fontSize: 12 }}>#{row.loanId}</span>

                {/* Borrower */}
                <span className="font-mono text-text-primary truncate" style={{ fontSize: 12 }}>{row.borrower}</span>

                {/* Tier badge */}
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 w-fit"
                  style={{ fontSize: 11, fontWeight: 500, background: `${tierCol}22`, color: tierCol }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: tierCol }} />
                  {row.tier}
                </span>

                {/* Principal */}
                <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>{fmtUsdc(row.principal)}</span>

                {/* APR */}
                <span className="font-mono text-text-secondary" style={{ fontSize: 12 }}>{(row.aprBps / 100).toFixed(0)}%</span>

                {/* State */}
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 w-fit font-medium"
                  style={{ fontSize: 11, background: ss.bg, color: ss.text }}
                >
                  {ss.label}
                </span>

                {/* Deadline */}
                <span className="font-mono text-text-tertiary" style={{ fontSize: 12 }}>{fmtDate(row.deadline)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
