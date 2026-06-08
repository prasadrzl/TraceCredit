'use client';

import { ModalShell, ModalBody, ModalRow, ModalDivider, ModalCta } from './modal-shell';
import type { DepositConfirmPayload } from '@/store/tx-modal-store';

const fmtUsdc = (raw: string) => {
  const v = Number(raw) / 1_000_000;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface Props { payload: DepositConfirmPayload; onClose: () => void }

export function DepositConfirmModal({ payload, onClose }: Props) {
  const annualYield = (
    (Number(payload.usdcIn) / 1_000_000) * (payload.apyBps / 10000)
  ).toFixed(2);

  const dailyYield = (Number(annualYield) / 365).toFixed(4);

  return (
    <ModalShell onClose={onClose}>
      <ModalBody>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: 'var(--success-subtle)' }}
          >
            🏦
          </div>
          <div>
            <p className="font-semibold text-text-primary" style={{ fontSize: 16 }}>Confirm Deposit</p>
            <p className="text-text-tertiary" style={{ fontSize: 12 }}>ERC-4626 vault · Base</p>
          </div>
        </div>

        {/* Amount hero */}
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--success-subtle)' }}>
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 11 }}>Depositing</p>
          <p className="font-mono font-bold" style={{ fontSize: 28, color: 'var(--success)' }}>
            {fmtUsdc(payload.usdcIn)}
          </p>
          <p className="text-text-secondary mt-0.5" style={{ fontSize: 12 }}>USDC · Base</p>
        </div>

        {/* LP details */}
        <div className="surface-base p-3 rounded-xl space-y-2.5">
          <ModalRow label="USDC in" value={fmtUsdc(payload.usdcIn)} />
          <ModalRow label="Shares received" value={payload.sharesOut} valueColor="var(--brand)" />
          <ModalRow label="Share price" value={`$${(Number(payload.sharePrice) / 1_000_000).toFixed(4)}`} />
          <ModalRow label="Your pool share" value={`${(payload.poolShareBps / 100).toFixed(2)}%`} />
        </div>

        {/* APY preview */}
        <div className="surface-base p-3 rounded-xl space-y-2.5">
          <p className="text-text-tertiary font-medium" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Yield preview
          </p>
          <ModalDivider />
          <ModalRow
            label="Net LP APY"
            value={`${(payload.apyBps / 100).toFixed(2)}%`}
            valueColor="var(--success)"
          />
          <ModalRow label="Annual yield est." value={`$${annualYield}`} valueColor="var(--success)" />
          <ModalRow label="Daily yield est." value={`$${dailyYield}`} />
        </div>

        {/* Note */}
        <div className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
          <p className="text-text-secondary" style={{ fontSize: 12 }}>
            Shares auto-accrue yield. Withdraw at any time — no lockup on LP position.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2 pt-1">
          <ModalCta label={`Deposit ${fmtUsdc(payload.usdcIn)}`} onClick={payload.onConfirm} />
          <ModalCta label="Cancel" onClick={onClose} variant="ghost" />
        </div>
      </ModalBody>
    </ModalShell>
  );
}
