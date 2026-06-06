'use client';

import { useState } from 'react';
import type { LoanDetail, InterestAccrual } from '@/types/loan-detail';
import { useTxModal } from '@/store/tx-modal-store';

const WALLET_BALANCE = 3847.21;

interface Props { loan: LoanDetail; interest: InterestAccrual }

export function RepayPanel({ loan, interest }: Props) {
  const outstanding = parseFloat(loan.outstanding);
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const { open, transitionTo } = useTxModal();

  const parsed = parseFloat(amount) || 0;
  const pctOfOutstanding = outstanding > 0 ? Math.min((parsed / outstanding) * 100, 100) : 0;

  const handleRepay = () => {
    open({
      type: 'repay-confirm',
      loanId: `#${loan.loanNum}`,
      amount: loan.principal,
      isGrace: loan.state === 'GracePeriod',
      scoreGain: 22,
      currentScore: 650,
      newScore: 672,
      creditRestored: loan.principal,
      onConfirm: () => {
        transitionTo({ type: 'tx-pending', description: `Repaying loan #${loan.loanNum}`, step: 'signing' });
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Repaying loan #${loan.loanNum}`, step: 'submitted', txHash: '0xrepay123' }), 1200);
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Repaying loan #${loan.loanNum}`, step: 'confirming', txHash: '0xrepay123' }), 2800);
        setTimeout(() => transitionTo({ type: 'tx-success', description: `Loan #${loan.loanNum} repaid`, txHash: '0xrepay123', scoreChange: 22, newScore: 672, ctaLabel: 'View history', ctaHref: '/history' }), 4400);
      },
    });
  };

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12 }}>⊙</span>
          <span className="font-semibold text-text-primary" style={{ fontSize: 14 }}>Repay now</span>
        </div>
        <span className="text-text-tertiary" style={{ fontSize: 11 }}>USDC · Base</span>
      </div>

      {/* Amount input */}
      <div className="flex items-center gap-2 px-3 py-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="flex-1 bg-transparent outline-none font-mono font-bold text-text-primary"
          style={{ fontSize: 22 }}
        />
        <span className="text-text-tertiary font-medium" style={{ fontSize: 13 }}>USDC</span>
        <button
          onClick={() => setAmount(outstanding.toFixed(2))}
          className="px-2 py-0.5 rounded font-semibold text-white"
          style={{ background: 'var(--brand)', fontSize: 11 }}
        >
          MAX
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-text-tertiary" style={{ fontSize: 12 }}>Wallet balance</span>
        <span className="font-mono text-text-secondary" style={{ fontSize: 12 }}>{WALLET_BALANCE.toLocaleString()} USDC</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-text-tertiary" style={{ fontSize: 12 }}>You will pay</span>
        <span className="font-mono text-text-secondary" style={{ fontSize: 12 }}>{pctOfOutstanding.toFixed(1)}% of outstanding</span>
      </div>

      <button
        onClick={handleRepay}
        disabled={parsed <= 0 || parsed > WALLET_BALANCE}
        className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90"
        style={{ background: 'var(--success)', fontSize: 14 }}
      >
        ✓ Repay {parsed > 0 ? parsed.toFixed(2) : '0.00'} USDC
      </button>

      <p className="text-center text-text-tertiary" style={{ fontSize: 11 }}>
        ⓘ Full repayment closes the loan and triggers the score event.
      </p>
    </div>
  );
}
