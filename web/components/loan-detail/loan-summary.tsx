'use client';

import type { LoanDetail } from '@/types/loan-detail';
import { ExternalLink } from 'lucide-react';

interface Props { loan: LoanDetail }

export function LoanSummary({ loan }: Props) {
  const rows = [
    { label: 'Principal',      value: `$${loan.principal} USDC` },
    { label: 'Outstanding',    value: `$${loan.outstanding} USDC`, highlight: 'var(--brand)' },
    { label: 'Interest rate',  value: `${(loan.interestRateBps / 100).toFixed(2)}% APR · fixed` },
    { label: 'Deadline',       value: loan.deadline },
    { label: 'Grace period',   value: `${loan.gracePeriodDays}d after deadline`, mono: true },
    { label: 'Credit used',    value: `$${loan.creditUsed} / $${loan.creditLimit} · ${loan.creditPct}%` },
    { label: 'Network',        value: loan.network },
    { label: 'Open tx',        value: loan.openTxHash, isLink: true },
  ];

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: 12 }}>⊙</span>
        <span className="font-semibold text-text-primary" style={{ fontSize: 14 }}>Loan summary</span>
      </div>

      <div className="space-y-2.5">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-text-secondary" style={{ fontSize: 13 }}>{row.label}</span>
            {row.isLink ? (
              <a href={loan.basescanUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-text-tertiary hover:text-text-secondary transition-colors"
                style={{ fontSize: 12 }}>
                {row.value} <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className={`font-mono font-medium ${row.mono ? '' : ''}`}
                style={{ fontSize: 13, color: row.highlight ?? 'var(--text-primary)' }}>
                {row.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
