'use client';

import { TrendingUp, TrendingDown, Database, DollarSign, Users, Star } from 'lucide-react';
import { useDashboardStats, useDashboardVault } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  sub?: string;
}

function StatCard({ icon, label, value, delta, sub }: StatCardProps) {
  return (
    <div className="card-base flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-text-tertiary" style={{ fontSize: 11 }}>
        {icon}
        <span className="font-medium tracking-wide uppercase">{label}</span>
      </div>
      <div>
        <p className="font-mono font-medium" style={{ fontSize: 22, lineHeight: 1 }}>{value}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {delta && (
            <span className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              delta.positive ? 'text-[var(--success)]' : 'text-[var(--danger-hover)]',
            )}>
              {delta.positive
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />}
              {delta.value}
            </span>
          )}
          {sub && <span className="text-text-tertiary" style={{ fontSize: 11 }}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="card-base space-y-3">
      <Skeleton className="h-3 w-28 bg-bg-surface" />
      <Skeleton className="h-6 w-24 bg-bg-surface" />
      <Skeleton className="h-3 w-20 bg-bg-surface" />
    </div>
  );
}

function fmt(raw: string | undefined): string {
  if (!raw) return '—';
  const n = Number(raw) / 1_000_000;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export function DashboardStatCards() {
  const { data: stats, isLoading: sl } = useDashboardStats();
  const { data: vault, isLoading: vl } = useDashboardVault();

  if (sl || vl) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<Database className="h-3 w-3" />}
        label="Total Value Locked"
        value={fmt(vault?.totalAssets)}
        delta={{ value: '+2.4%', positive: true }}
        sub="last 24h"
      />
      <StatCard
        icon={<DollarSign className="h-3 w-3" />}
        label="Total Borrowed"
        value={fmt(vault?.outstandingLoans)}
        delta={{ value: '+4.1%', positive: true }}
        sub="last 24h"
      />
      <StatCard
        icon={<Users className="h-3 w-3" />}
        label="Active Borrowers"
        value={(stats?.activeBorrowers ?? 0).toLocaleString()}
        delta={{ value: `+18`, positive: true }}
        sub="vs last week"
      />
      <StatCard
        icon={<Star className="h-3 w-3" />}
        label="Average Score"
        value={String(stats?.averageScore ?? 0)}
        delta={{ value: '-3', positive: false }}
        sub="across all tiers"
      />
    </div>
  );
}
