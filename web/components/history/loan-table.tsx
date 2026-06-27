'use client';

import { useState } from 'react';
import type { HistoryLoan, HistoryLoanState } from '@/types/history';
import { useTxModal } from '@/store/tx-modal-store';
import { useAccount } from 'wagmi';
import { useWalletScore } from '@/hooks/use-wallet-score';
import { useProtocolConfig, PROTOCOL_CONFIG_DEFAULTS } from '@/hooks/use-config';
import { ExternalLink, ClockArrowUp } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

const STATE_STYLES: Record<HistoryLoanState, { label: string; bg: string; color: string }> = {
  Active:      { label: 'Active',       bg: 'var(--success-subtle)',  color: 'var(--success)' },
  GracePeriod: { label: 'Grace period', bg: 'var(--warning-subtle)',  color: 'var(--warning)' },
  Repaid:      { label: 'Repaid',       bg: 'rgba(99,102,241,0.12)',  color: '#818CF8' },
  Defaulted:   { label: 'Defaulted',    bg: 'var(--danger-subtle)',   color: 'var(--danger)' },
};

const PAGE_SIZE = 8;

type Filter = 'All' | HistoryLoanState;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Active', label: 'Active' },
  { key: 'GracePeriod', label: 'Grace period' },
  { key: 'Repaid', label: 'Repaid' },
  { key: 'Defaulted', label: 'Defaulted' },
];

interface Props { loans: HistoryLoan[]; onLoanClick: (loanNum: number) => void }

export function LoanTable({ loans, onLoanClick }: Props) {
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { open, transitionTo } = useTxModal();
  const { address } = useAccount();
  const { data: scoreData } = useWalletScore(address);
  const { data: cfg } = useProtocolConfig();
  const currentScore = scoreData?.score ?? 0;
  const scoreGain = cfg?.onTimeRepaymentScoreGain ?? PROTOCOL_CONFIG_DEFAULTS.onTimeRepaymentScoreGain;
  const scorePenalty = cfg?.gracePeriodScoreHit ?? PROTOCOL_CONFIG_DEFAULTS.gracePeriodScoreHit;

  const counts = FILTERS.reduce((acc, f) => {
    acc[f.key] = f.key === 'All' ? loans.length : loans.filter(l => l.state === f.key).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = loans.filter(l => {
    const matchesFilter = filter === 'All' || l.state === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || String(l.loanNum).includes(q) || l.principal.includes(q) || l.txHash.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRepay = (loan: HistoryLoan) => {
    const isGrace = loan.state === 'GracePeriod';
    const newScore = isGrace ? Math.max(0, currentScore - scorePenalty) : currentScore + scoreGain;
    open({
      type: 'repay-confirm',
      loanId: `#${loan.loanNum}`,
      amount: loan.principal,
      isGrace,
      scoreGain: isGrace ? 0 : scoreGain,
      currentScore,
      newScore,
      creditRestored: loan.principal,
      onConfirm: () => {
        transitionTo({ type: 'tx-pending', description: `Repaying loan #${loan.loanNum}`, step: 'signing' });
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Repaying loan #${loan.loanNum}`, step: 'submitted', txHash: '0xrepay123' }), 1200);
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Repaying loan #${loan.loanNum}`, step: 'confirming', txHash: '0xrepay123' }), 2800);
        setTimeout(() => transitionTo({ type: 'tx-success', description: `Loan #${loan.loanNum} repaid`, txHash: '0xrepay123', scoreChange: isGrace ? -scorePenalty : scoreGain, newScore, ctaLabel: 'View history', ctaHref: '/history' }), 4400);
      },
    });
  };

  return (
    <div className="card-base p-0 overflow-hidden">
      {/* Filters + Search + Export */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors"
              style={{
                fontSize: 12, fontWeight: filter === f.key ? 600 : 400,
                background: filter === f.key ? 'var(--brand)' : 'transparent',
                color: filter === f.key ? '#fff' : 'var(--text-secondary)',
                border: filter === f.key ? 'none' : '0.5px solid var(--border)',
              }}
            >
              {f.label}
              <span className="font-mono" style={{ fontSize: 10, opacity: 0.8 }}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>🔍</span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by loan ID or amount..."
              className="bg-transparent outline-none text-text-primary"
              style={{ fontSize: 12, width: 200 }}
            />
            <span className="text-text-tertiary font-mono" style={{ fontSize: 10 }}>⌘K</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors" style={{ border: '0.5px solid var(--border)', fontSize: 12 }}>
            <span>⊞</span> Filters
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors" style={{ border: '0.5px solid var(--border)', fontSize: 12 }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              {['LOAN ID', 'OPENED', 'PRINCIPAL', 'INTEREST PAID', 'APR', 'STATE', 'DEADLINE', 'ACTION'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-text-tertiary font-medium" style={{ fontSize: 10, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center">
                  <EmptyState
                    icon={<ClockArrowUp size={22} />}
                    title="No loan history"
                    description="Your completed, active, and past loans will appear here."
                  />
                </td>
              </tr>
            )}
            {paged.map(loan => {
              const style = STATE_STYLES[loan.state];
              const isActive = loan.state === 'Active' || loan.state === 'GracePeriod';
              return (
                <tr
                  key={loan.loanNum}
                  className="hover:bg-bg-surface transition-colors cursor-pointer"
                  style={{ borderBottom: '0.5px solid var(--border)' }}
                  onClick={() => onLoanClick(loan.loanNum)}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-text-tertiary" style={{ fontSize: 13 }}>⊙</span>
                      <div>
                        <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 13 }}>#{loan.loanNum}</p>
                        <p className="font-mono text-text-tertiary" style={{ fontSize: 10 }}>{loan.txHash}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-text-primary" style={{ fontSize: 13 }}>{loan.openedDate}</p>
                    <p className="text-text-tertiary font-mono" style={{ fontSize: 10 }}>{loan.openedIso}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 13 }}>${loan.principal}</p>
                    <p className="text-text-tertiary" style={{ fontSize: 10 }}>USDC</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-mono font-semibold text-text-primary" style={{ fontSize: 13 }}>${loan.interestPaid}</p>
                    <p className="text-text-tertiary font-mono" style={{ fontSize: 10 }}>{loan.interestPct.toFixed(2)}%</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-mono text-text-secondary" style={{ fontSize: 13 }}>{(loan.aprBps / 100).toFixed(2)}%</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-md" style={{ fontSize: 11, fontWeight: 500, background: style.bg, color: style.color }}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {isActive ? (
                      loan.state === 'GracePeriod' ? (
                        <div>
                          <p className="font-medium" style={{ fontSize: 12, color: 'var(--warning)' }}>{loan.graceDeadline}</p>
                          <p className="text-text-tertiary" style={{ fontSize: 10 }}>{loan.gracePeriodLeft} grace left</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-text-primary" style={{ fontSize: 13 }}>{loan.deadline}</p>
                          <p className="text-text-tertiary" style={{ fontSize: 10 }}>{loan.daysLeft} days left</p>
                        </div>
                      )
                    ) : (
                      <div>
                        <p className="font-mono text-text-tertiary line-through" style={{ fontSize: 12 }}>{loan.deadline}</p>
                        <p className="text-text-tertiary" style={{ fontSize: 10 }}>{loan.closedNote}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    {loan.state === 'Active' && (
                      <button
                        onClick={() => handleRepay(loan)}
                        className="px-3 py-1.5 rounded-lg font-semibold text-white"
                        style={{ background: 'var(--brand)', fontSize: 12 }}
                      >
                        Repay
                      </button>
                    )}
                    {loan.state === 'GracePeriod' && (
                      <button
                        onClick={() => handleRepay(loan)}
                        className="px-3 py-1.5 rounded-lg font-semibold"
                        style={{ background: 'var(--warning-subtle)', color: 'var(--warning)', border: '0.5px solid var(--warning)', fontSize: 12 }}
                      >
                        Repay now
                      </button>
                    )}
                    {(loan.state === 'Repaid' || loan.state === 'Defaulted') && (
                      <button className="flex items-center gap-1 text-text-tertiary hover:text-text-secondary transition-colors" style={{ fontSize: 12 }}>
                        Receipt <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '0.5px solid var(--border)' }}>
        <p className="text-text-tertiary" style={{ fontSize: 12 }}>
          Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} loans
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
            style={{ border: '0.5px solid var(--border)', fontSize: 14 }}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className="h-7 w-7 rounded-md flex items-center justify-center font-medium transition-colors"
              style={{ fontSize: 12, background: p === page ? 'var(--brand)' : 'transparent', color: p === page ? '#fff' : 'var(--text-secondary)', border: p === page ? 'none' : '0.5px solid var(--border)' }}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
            style={{ border: '0.5px solid var(--border)', fontSize: 14 }}>›</button>
        </div>
      </div>
    </div>
  );
}
