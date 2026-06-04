'use client';

import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, Zap, Users } from 'lucide-react';
import { useMarketStats } from '@/hooks/use-markets';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

function fmt(raw: string | undefined): string {
  if (!raw) return '—';
  const n = Number(raw) / 1_000_000;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtDelta(bps: number): string {
  return `${bps > 0 ? '+' : ''}${(bps / 100).toFixed(1)}%`;
}

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: React.ReactNode;
}

function StatCard({ icon, label, value, sub }: CardProps) {
  return (
    <div className="card-base flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-text-tertiary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <p className="font-mono font-medium text-text-primary" style={{ fontSize: 22, lineHeight: 1 }}>{value}</p>
      <div className="text-xs">{sub}</div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="card-base space-y-2">
      <Skeleton className="h-3 w-28 bg-bg-surface" />
      <Skeleton className="h-6 w-24 bg-bg-surface" />
      <Skeleton className="h-3 w-20 bg-bg-surface" />
    </div>
  );
}

export function MarketStatCards() {
  const { data, isLoading } = useMarketStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)}
      </div>
    );
  }

  const d = data!;
  const utilPct = (d.utilisationBps / 100).toFixed(1);
  const kinkPct  = 70;
  const capPct   = 90;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <StatCard
        icon={<DollarSign className="h-3 w-3" />}
        label="24H Borrow Vol"
        value={fmt(d.borrowVol24h)}
        sub={
          <span className={cn('flex items-center gap-0.5 font-medium', d.borrowVolDeltaBps >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
            {d.borrowVolDeltaBps >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {fmtDelta(d.borrowVolDeltaBps)}
            <span className="text-text-tertiary font-normal ml-1">vs prev day</span>
          </span>
        }
      />
      <StatCard
        icon={<ArrowUpRight className="h-3 w-3" />}
        label="24H Repay Vol"
        value={fmt(d.repayVol24h)}
        sub={
          <span className={cn('flex items-center gap-0.5 font-medium', d.repayVolDeltaBps >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
            {d.repayVolDeltaBps >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {fmtDelta(d.repayVolDeltaBps)}
            <span className="text-text-tertiary font-normal ml-1">vs prev day</span>
          </span>
        }
      />
      <StatCard
        icon={<Zap className="h-3 w-3" />}
        label="Utilisation"
        value={`${utilPct}%`}
        sub={<span className="text-text-tertiary">Target {kinkPct}% · cap {capPct}%</span>}
      />
      <StatCard
        icon={<Zap className="h-3 w-3 text-[var(--danger)]" />}
        label="Liquidations 24H"
        value={String(d.liquidations24h)}
        sub={
          <span style={{ color: 'var(--danger)' }}>
            {fmt(d.liquidationsWrittenOff24h)} written off
          </span>
        }
      />
      <StatCard
        icon={<Users className="h-3 w-3" />}
        label="Total Borrowers"
        value={String(d.totalBorrowers)}
        sub={<span className="text-text-tertiary">{d.activeBorrowers} active · {d.repaidBorrowers} repaid</span>}
      />
    </div>
  );
}
