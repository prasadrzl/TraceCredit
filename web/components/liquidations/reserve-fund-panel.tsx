'use client';

import type { ReserveFund } from '@/types/liquidation';
import { ShieldCheck } from 'lucide-react';

function fmtUsd(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

interface Props { fund: ReserveFund }

export function ReserveFundPanel({ fund }: Props) {
  const healthColor = fund.healthPct >= 90 ? 'var(--success)' : fund.healthPct >= 70 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="card-base">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-text-tertiary" />
          <span className="font-medium text-text-primary" style={{ fontSize: 13 }}>Reserve fund</span>
        </div>
        <span className="text-text-tertiary" style={{ fontSize: 11 }}>USDC · Base</span>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <p className="font-mono font-bold text-text-primary" style={{ fontSize: 24 }}>{fmtUsd(fund.balance)}</p>
        <span className="font-medium" style={{ fontSize: 12, color: healthColor }}>{fund.healthPct}% healthy</span>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${fund.healthPct}%`, background: healthColor }} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {[
          { label: 'BAD DEBT ABSORBED', value: fmtUsd(fund.badDebtAbsorbed), color: fund.badDebtAbsorbed < 0 ? 'var(--danger)' : undefined },
          { label: 'NET INFLOWS · 30D', value: `+${fmtUsd(fund.netInflows30d)}`, color: 'var(--success)' },
          { label: 'COVERAGE RATIO', value: `${fund.coverageRatio.toFixed(2)}×`, color: undefined },
          { label: 'TARGET FLOOR', value: fmtUsd(fund.targetFloor), color: undefined },
        ].map(r => (
          <div key={r.label}>
            <p className="text-text-tertiary font-medium" style={{ fontSize: 9, letterSpacing: '0.06em' }}>{r.label}</p>
            <p className="font-mono font-semibold mt-0.5" style={{ fontSize: 13, color: r.color ?? 'var(--text-primary)' }}>{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
