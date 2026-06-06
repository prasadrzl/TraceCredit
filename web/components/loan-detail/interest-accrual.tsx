'use client';

import type { InterestAccrual, LoanDetail } from '@/types/loan-detail';

interface Props { interest: InterestAccrual; loan: LoanDetail }

export function InterestAccrualCard({ interest, loan }: Props) {
  const daysTotal = 30;
  const daysElapsed = daysTotal - loan.daysLeft;
  const progress = Math.min((daysElapsed / daysTotal) * 100, 100);

  return (
    <div className="card-base">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12 }}>%</span>
          <span className="font-semibold text-text-primary" style={{ fontSize: 14 }}>Interest accrual</span>
        </div>
        <span className="text-text-tertiary" style={{ fontSize: 12 }}>{daysElapsed.toFixed(1)} / {daysTotal} days elapsed</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>⊙ PRINCIPAL</span>
          <span className="font-mono font-semibold text-text-primary ml-auto" style={{ fontSize: 13 }}>${interest.principal} USDC</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>↗ ACCRUED INTEREST</span>
          <span className="font-mono font-semibold ml-auto" style={{ fontSize: 13, color: '#EF9F27' }}>${interest.accruedInterest} USDC</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>⏱ DAILY RATE</span>
          <span className="font-mono font-semibold text-text-primary ml-auto" style={{ fontSize: 13 }}>${interest.dailyRate} / day</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>% APR</span>
          <span className="font-mono font-semibold ml-auto" style={{ fontSize: 13, color: 'var(--brand)' }}>{(interest.aprBps / 100).toFixed(2)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>⊞ BLOCKS ELAPSED</span>
          <span className="font-mono font-semibold text-text-primary ml-auto" style={{ fontSize: 13 }}>{interest.blocksElapsed.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>📅 PROJECTED AT DEADLINE</span>
          <span className="font-mono font-semibold text-text-primary ml-auto" style={{ fontSize: 13 }}>${interest.projectedAtDeadline} USDC</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
        <p className="text-text-tertiary" style={{ fontSize: 11 }}>ⓘ Interest accrues per block. Quoted in USDC at current oracle price.</p>
        <span className="font-mono text-text-secondary" style={{ fontSize: 11 }}>{interest.projectedDisplay}</span>
      </div>
    </div>
  );
}
