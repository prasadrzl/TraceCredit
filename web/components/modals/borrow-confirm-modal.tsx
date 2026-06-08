'use client';

import { ModalShell, ModalBody, ModalRow, ModalDivider, ModalCta } from './modal-shell';
import type { BorrowConfirmPayload } from '@/store/tx-modal-store';

const fmtUsdc = (raw: string) => {
  const v = Number(raw) / 1_000_000;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CHECK_ITEMS = [
  { label: 'Wallet connected & on Base',    key: 'wallet'  },
  { label: 'Credit limit not exceeded',     key: 'credit'  },
  { label: '24h rate limit available',      key: 'rate'    },
];

interface Props { payload: BorrowConfirmPayload; onClose: () => void }

export function BorrowConfirmModal({ payload, onClose }: Props) {
  const interest30d = (
    (Number(payload.amount) / 1_000_000) *
    (payload.aprBps / 10000) *
    (30 / 365)
  ).toFixed(2);

  const totalDue = (Number(payload.amount) / 1_000_000 + Number(interest30d)).toFixed(2);
  const usedAfter = Number(payload.creditUsed) + Number(payload.amount);
  const usedPct = ((usedAfter / Number(payload.creditLimit)) * 100).toFixed(1);

  return (
    <ModalShell onClose={onClose}>
      <ModalBody>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: 'var(--brand-subtle)' }}
          >
            💸
          </div>
          <div>
            <p className="font-semibold text-text-primary" style={{ fontSize: 16 }}>Confirm Borrow</p>
            <p className="text-text-tertiary" style={{ fontSize: 12 }}>Review before signing</p>
          </div>
        </div>

        {/* Amount hero */}
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--brand-subtle)' }}>
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 11 }}>Borrowing</p>
          <p className="font-mono font-bold" style={{ fontSize: 28, color: 'var(--brand)' }}>
            {fmtUsdc(payload.amount)}
          </p>
          <p className="text-text-secondary mt-0.5" style={{ fontSize: 12 }}>USDC · Base</p>
        </div>

        {/* Loan details */}
        <div className="surface-base p-3 rounded-xl space-y-2.5">
          <ModalRow label="APR" value={`${(payload.aprBps / 100).toFixed(1)}%`} />
          <ModalRow label="Term" value={`${payload.deadlineDays} days`} />
          <ModalRow label="30-day interest" value={`$${interest30d}`} valueColor="var(--warning)" />
          <ModalRow label="Total due" value={`$${totalDue}`} />
          <ModalDivider />
          <ModalRow
            label="Credit after borrow"
            value={`${fmtUsdc(String(usedAfter * 1_000_000))} / ${fmtUsdc(payload.creditLimit)} (${usedPct}%)`}
            valueColor={Number(usedPct) > 80 ? 'var(--danger)' : 'var(--text-primary)'}
          />
        </div>

        {/* Pre-checks */}
        <div className="space-y-1.5">
          <p className="text-text-tertiary font-medium" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pre-checks
          </p>
          {CHECK_ITEMS.map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 text-xs" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>✓</span>
              <span className="text-text-secondary" style={{ fontSize: 12 }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* Score note */}
        <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
          <span style={{ fontSize: 13 }}>◈</span>
          <p className="text-text-secondary" style={{ fontSize: 12 }}>
            Score stays at <span className="font-mono font-medium text-text-primary">{payload.score}</span> — it updates on repayment
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2 pt-1">
          <ModalCta label={`Borrow ${fmtUsdc(payload.amount)}`} onClick={payload.onConfirm} />
          <ModalCta label="Cancel" onClick={onClose} variant="ghost" />
        </div>
      </ModalBody>
    </ModalShell>
  );
}
