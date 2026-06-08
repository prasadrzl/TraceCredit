'use client';

import { ModalShell, ModalBody, ModalRow, ModalDivider, ModalCta } from './modal-shell';
import type { RepayConfirmPayload } from '@/store/tx-modal-store';

const fmtUsdc = (raw: string) => {
  const v = Number(raw) / 1_000_000;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface Props { payload: RepayConfirmPayload; onClose: () => void }

export function RepayConfirmModal({ payload, onClose }: Props) {
  const scoreDelta = payload.newScore - payload.currentScore;

  return (
    <ModalShell onClose={onClose}>
      <ModalBody>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: 'var(--success-subtle)' }}
          >
            ✅
          </div>
          <div>
            <p className="font-semibold text-text-primary" style={{ fontSize: 16 }}>Confirm Repayment</p>
            <p className="text-text-tertiary" style={{ fontSize: 12 }}>Loan #{payload.loanId}</p>
          </div>
        </div>

        {/* Grace warning */}
        {payload.isGrace && (
          <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'var(--warning-subtle)', border: '0.5px solid var(--warning)' }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ fontSize: 12, color: 'var(--warning)' }}>
              This loan is in grace period. Repaying now clears the late mark and unlocks your credit line.
            </p>
          </div>
        )}

        {/* Amount hero */}
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--success-subtle)' }}>
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 11 }}>Repaying</p>
          <p className="font-mono font-bold" style={{ fontSize: 28, color: 'var(--success)' }}>
            {fmtUsdc(payload.amount)}
          </p>
          <p className="text-text-secondary mt-0.5" style={{ fontSize: 12 }}>USDC · Base</p>
        </div>

        {/* Repay breakdown */}
        <div className="surface-base p-3 rounded-xl space-y-2.5">
          <ModalRow label="Loan" value={`#${payload.loanId}`} />
          <ModalRow label="Total repaid" value={fmtUsdc(payload.amount)} />
          <ModalRow
            label="Credit restored"
            value={fmtUsdc(payload.creditRestored)}
            valueColor="var(--success)"
          />
          {payload.isGrace && (
            <ModalRow label="Grace period" value="Cleared ✓" valueColor="var(--success)" />
          )}
        </div>

        {/* Score impact */}
        <div className="surface-base p-3 rounded-xl space-y-2.5">
          <p className="text-text-tertiary font-medium" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Reputation impact
          </p>
          <ModalDivider />
          <div className="flex items-center justify-between">
            <span className="text-text-secondary" style={{ fontSize: 13 }}>Score change</span>
            <span className="font-mono font-semibold" style={{ fontSize: 15, color: scoreDelta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {scoreDelta >= 0 ? '+' : ''}{scoreDelta} pts
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary" style={{ fontSize: 13 }}>New score</span>
            <span className="font-mono font-semibold text-text-primary" style={{ fontSize: 15 }}>
              {payload.currentScore} → {payload.newScore}
            </span>
          </div>
          {payload.scoreGain > 0 && (
            <p className="text-text-tertiary" style={{ fontSize: 11 }}>
              +{payload.scoreGain} for on-time repayment signal
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2 pt-1">
          <ModalCta label={`Repay ${fmtUsdc(payload.amount)}`} onClick={payload.onConfirm} variant={payload.isGrace ? 'warning' : 'primary'} />
          <ModalCta label="Cancel" onClick={onClose} variant="ghost" />
        </div>
      </ModalBody>
    </ModalShell>
  );
}
