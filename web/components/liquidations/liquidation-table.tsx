'use client';

import { useState } from 'react';
import type { LiquidationRecord } from '@/types/liquidation';
import type { Tier } from '@/types/api';
import { TierBadge } from '@/components/common/tier-badge';

const PAGE_SIZE = 8;
type Filter = 'All' | 'Full' | 'Partial';

function RecoveryBar({ pct }: { pct: number }) {
  const color = pct === 100 ? 'var(--success)' : pct >= 70 ? '#EF9F27' : 'var(--danger)';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)', minWidth: 48 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono" style={{ fontSize: 11, color, minWidth: 28 }}>{pct}%</span>
    </div>
  );
}

function fmt(n: string) {
  const v = Number(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${(v / 1000).toFixed(0)}K`;
}

interface Props { records: LiquidationRecord[] }

export function LiquidationTable({ records }: Props) {
  const [filter, setFilter] = useState<Filter>('All');
  const [page, setPage] = useState(1);

  const filtered = records.filter(r => {
    if (filter === 'Full')    return r.recoveryPct === 100;
    if (filter === 'Partial') return r.recoveryPct < 100;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="card-base p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 12 }}>⊙</span>
          <span className="font-medium text-text-primary" style={{ fontSize: 13 }}>Liquidation records</span>
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>{records.length} events · sorted by recency</span>
        </div>
        <div className="flex items-center gap-1">
          {(['All', 'Full recovery', 'Partial'] as const).map((label, i) => {
            const key: Filter = i === 0 ? 'All' : i === 1 ? 'Full' : 'Partial';
            return (
              <button key={label} onClick={() => { setFilter(key); setPage(1); }}
                className="px-2.5 py-1 rounded-md transition-colors"
                style={{ fontSize: 11, fontWeight: filter === key ? 600 : 400, background: filter === key ? 'var(--brand)' : 'var(--bg-surface)', color: filter === key ? '#fff' : 'var(--text-secondary)', border: '0.5px solid var(--border)' }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              {['LOAN ID', 'BORROWER', 'TIER', 'PRINCIPAL', 'RECOVERED', 'WRITTEN OFF', 'RECOVERY', 'KEEPER TX'].map(h => (
                <th key={h} className="text-left px-3 py-3 text-text-tertiary font-medium" style={{ fontSize: 10, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(r => (
              <tr key={r.loanNum} className="hover:bg-bg-surface transition-colors" style={{ borderBottom: '0.5px solid var(--border)' }}>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-tertiary" style={{ fontSize: 12 }}>⊙</span>
                    <div>
                      <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 12 }}>#{r.loanNum}</p>
                      <p className="font-mono text-text-tertiary" style={{ fontSize: 10 }}>{r.loanTxHash}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <p className="font-mono text-text-primary" style={{ fontSize: 12 }}>{r.borrowerShort}</p>
                  <p className="text-text-tertiary" style={{ fontSize: 10 }}>score {r.borrowerScore}</p>
                </td>
                <td className="px-3 py-3.5">
                  <TierBadge tier={r.tier as Tier} size="sm" />
                </td>
                <td className="px-3 py-3.5">
                  <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 12 }}>{fmt(r.principal)}</p>
                </td>
                <td className="px-3 py-3.5">
                  <p className="font-mono font-semibold" style={{ fontSize: 12, color: 'var(--success)' }}>{fmt(r.recovered)}</p>
                </td>
                <td className="px-3 py-3.5">
                  {r.writtenOff
                    ? <p className="font-mono font-semibold" style={{ fontSize: 12, color: 'var(--danger)' }}>{fmt(r.writtenOff)}</p>
                    : <span className="text-text-tertiary" style={{ fontSize: 12 }}>—</span>}
                </td>
                <td className="px-3 py-3.5 min-w-[100px]">
                  <RecoveryBar pct={r.recoveryPct} />
                </td>
                <td className="px-3 py-3.5">
                  <p className="font-mono text-text-tertiary" style={{ fontSize: 10 }}>{r.keeperTxHash}</p>
                  <p className="text-text-tertiary" style={{ fontSize: 10 }}>{r.keeperDate}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '0.5px solid var(--border)' }}>
        <p className="text-text-tertiary" style={{ fontSize: 12 }}>
          Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} liquidations
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-tertiary disabled:opacity-30"
            style={{ border: '0.5px solid var(--border)', fontSize: 14 }}>‹</button>
          <button className="h-7 w-7 rounded-md flex items-center justify-center font-medium text-white"
            style={{ background: 'var(--brand)', fontSize: 12 }}>{page}</button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-tertiary disabled:opacity-30"
            style={{ border: '0.5px solid var(--border)', fontSize: 14 }}>›</button>
        </div>
      </div>
    </div>
  );
}
