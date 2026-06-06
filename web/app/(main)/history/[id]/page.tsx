'use client';

import { use } from 'react';
import Link from 'next/link';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLoanDetail, useLoanInterest, useLoanRepayments, useLoanScoreImpact } from '@/hooks/use-loan-detail';
import { LifecycleTimeline } from '@/components/loan-detail/lifecycle-timeline';
import { InterestAccrualCard } from '@/components/loan-detail/interest-accrual';
import { RepayPanel } from '@/components/loan-detail/repay-panel';
import { LoanSummary } from '@/components/loan-detail/loan-summary';
import { ScoreImpactCard } from '@/components/loan-detail/score-impact';

const STATE_STYLES: Record<string, { bg: string; color: string }> = {
  Active:      { bg: 'var(--success-subtle)',  color: 'var(--success)' },
  GracePeriod: { bg: 'var(--warning-subtle)',  color: 'var(--warning)' },
  Repaid:      { bg: 'rgba(99,102,241,0.12)',  color: '#818CF8' },
  Defaulted:   { bg: 'var(--danger-subtle)',   color: 'var(--danger)' },
};

interface Props { params: Promise<{ id: string }> }

export default function LoanDetailPage({ params }: Props) {
  const { id } = use(params);
  const loanNum = parseInt(id, 10);
  const qc = useQueryClient();

  const { data: loan }   = useLoanDetail(loanNum);
  const { data: interest } = useLoanInterest(loanNum);
  const { data: repayments } = useLoanRepayments(loanNum);
  const { data: impact }  = useLoanScoreImpact(loanNum);

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['loan-detail', loanNum] });
  };

  if (!loan || !interest || !impact) {
    return (
      <div className="container py-6">
        <div className="h-96 rounded-2xl animate-pulse" style={{ background: 'var(--bg-surface)' }} />
      </div>
    );
  }

  const stateStyle = STATE_STYLES[loan.state] ?? STATE_STYLES.Active;

  return (
    <div className="container py-6 space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-text-tertiary" style={{ fontSize: 13 }}>
        <Link href="/borrow" className="hover:text-text-secondary transition-colors">Borrow</Link>
        <span>/</span>
        <Link href="/history" className="hover:text-text-secondary transition-colors">History</Link>
        <span>/</span>
        <span className="font-medium" style={{ color: 'var(--brand)' }}>Loan #{loan.loanNum}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Loan header card */}
          <div className="card-base space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h1 className="font-bold text-text-primary" style={{ fontSize: 22 }}>Loan #{loan.loanNum}</h1>
                <span className="px-2.5 py-0.5 rounded-full font-medium" style={{ fontSize: 12, background: stateStyle.bg, color: stateStyle.color }}>
                  {loan.state === 'GracePeriod' ? 'Grace period' : loan.state}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a href={loan.basescanUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                  style={{ border: '0.5px solid var(--border)', fontSize: 12 }}>
                  <ExternalLink className="h-3.5 w-3.5" /> View on BaseScan
                </a>
                <button onClick={handleRefresh}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                  style={{ border: '0.5px solid var(--border)', fontSize: 12 }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
            </div>

            {/* Metadata chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: '⊙', label: 'Borrower', value: loan.borrower },
                { icon: '📅', label: 'Opened',   value: loan.openedDisplay },
                { icon: '🌐', label: 'Network',  value: loan.network },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', fontSize: 12 }}>
                  <span style={{ fontSize: 11 }}>{c.icon}</span>
                  <span className="text-text-tertiary">{c.label}</span>
                  <span className="font-mono text-text-primary">{c.value}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--warning-subtle)', border: '0.5px solid var(--warning)', fontSize: 12 }}>
                <span style={{ fontSize: 11 }}>⏱</span>
                <span style={{ color: 'var(--warning)' }}>Deadline</span>
                <span className="font-mono font-medium" style={{ color: 'var(--warning)' }}>{loan.deadline} · {loan.daysLeft}d left</span>
              </div>
            </div>

            <LifecycleTimeline loan={loan} />
          </div>

          <InterestAccrualCard interest={interest} loan={loan} />

          {/* Repayment history */}
          <div className="card-base">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: 12 }}>↗</span>
                <span className="font-semibold text-text-primary" style={{ fontSize: 14 }}>Repayment history</span>
              </div>
              <span className="text-text-tertiary" style={{ fontSize: 12 }}>{(repayments ?? []).length} payments</span>
            </div>

            {(repayments ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
                  <span style={{ fontSize: 18 }}>✗</span>
                </div>
                <p className="font-medium text-text-secondary" style={{ fontSize: 14 }}>No repayments yet</p>
                <p className="text-text-tertiary text-center" style={{ fontSize: 12, maxWidth: 280 }}>
                  This loan was opened recently. Repayments — partial or full — will appear here once they post on-chain.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {repayments!.map(r => (
                  <div key={r.txHash} className="flex items-center justify-between py-2" style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <span className="text-text-secondary" style={{ fontSize: 13 }}>{r.date}</span>
                    <span className="font-mono font-semibold" style={{ fontSize: 13, color: 'var(--success)' }}>${r.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <RepayPanel loan={loan} interest={interest} />
          <LoanSummary loan={loan} />
          <ScoreImpactCard impact={impact} />
        </div>
      </div>
    </div>
  );
}
