'use client';

import { useDashboardVault } from '@/hooks/use-dashboard';
import { usePoolConfig } from '@/hooks/use-pool';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

function fmt(raw: string): string {
  const n = Number(raw) / 1_000_000;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export function PoolUtilisationPanel() {
  const { data: vault, isLoading: vaultLoading } = useDashboardVault();
  const { data: config, isLoading: configLoading } = usePoolConfig();

  if (vaultLoading || configLoading) {
    return (
      <div className="card-base space-y-4">
        <Skeleton className="h-4 w-32 bg-bg-surface" />
        <Skeleton className="h-8 w-24 bg-bg-surface" />
        <Skeleton className="h-3 w-full bg-bg-surface" />
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-10 bg-bg-surface" />)}
        </div>
      </div>
    );
  }

  const kinkPct = (config?.kinkBps ?? 7000) / 100;
  const capPct  = (config?.capBps  ?? 9000) / 100;

  const util = (vault?.utilisationBps ?? 0) / 100;
  const supplied  = vault?.totalAssets      ?? '0';
  const borrowed  = vault?.outstandingLoans ?? '0';
  const available = String(Number(supplied) - Number(borrowed));

  const fillColor =
    util >= capPct  ? 'var(--danger)'   :
    util >= kinkPct ? 'var(--warning)'  :
                      'var(--brand)';

  const statusLabel =
    util >= capPct  ? 'Above cap — critical' :
    util >= kinkPct ? 'Above kink — elevated' :
                      'Below kink — healthy';

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Pool Utilisation</span>
        <span style={{ fontSize: 11 }} className="text-text-tertiary">USDC market · Base</span>
      </div>

      <div className="flex items-end justify-between">
        <span className="font-mono font-medium" style={{ fontSize: 28 }}>
          {util.toFixed(1)}%
        </span>
        <span style={{ fontSize: 11 }} className={cn(
          util >= capPct  ? 'text-[var(--danger)]' :
          util >= kinkPct ? 'text-[var(--warning)]' :
                            'text-[var(--success)]',
        )}>
          {statusLabel}
        </span>
      </div>

      <div className="space-y-1">
        <div className="relative h-2 w-full rounded-full overflow-visible bg-bg-surface" style={{ border: '0.5px solid var(--border)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(util, 100)}%`, background: fillColor }}
          />
          <div className="absolute top-[-4px] bottom-[-4px] w-px" style={{ left: `${kinkPct}%`, background: 'var(--warning)' }} />
          <div className="absolute top-[-4px] bottom-[-4px] w-px" style={{ left: `${capPct}%`, background: 'var(--danger)' }} />
        </div>

        <div className="relative h-4 text-2xs">
          <span className="absolute" style={{ left: `${kinkPct - 2}%`, color: 'var(--warning)', fontWeight: 500 }}>
            KINK · {kinkPct}%
          </span>
          <span className="absolute" style={{ left: `${capPct - 2}%`, color: 'var(--danger)', fontWeight: 500 }}>
            CAP · {capPct}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { label: 'SUPPLIED',  value: fmt(supplied)  },
          { label: 'BORROWED',  value: fmt(borrowed)  },
          { label: 'AVAILABLE', value: fmt(available) },
        ].map(({ label, value }) => (
          <div key={label} className="surface-base p-2.5">
            <p className="text-text-tertiary mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p className="font-mono font-medium text-text-primary" style={{ fontSize: 14 }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
