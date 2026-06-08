'use client';

import { ModalShell, ModalBody, ModalRow, ModalDivider, ModalCta } from './modal-shell';
import type { WithdrawConfirmPayload } from '@/store/tx-modal-store';

const fmtUsdc = (raw: string) => {
  const v = Number(raw) / 1_000_000;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface Props { payload: WithdrawConfirmPayload; onClose: () => void }

export function WithdrawConfirmModal({ payload, onClose }: Props) {
  const liquidityOk = Number(payload.usdcOut) <= Number(payload.availableLiquidity);

  return (
    <ModalShell onClose={onClose}>
      <ModalBody>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: 'var(--warning-subtle)' }}
          >
            🏧
          </div>
          <div>
            <p className="font-semibold text-text-primary" style={{ fontSize: 16 }}>Confirm Withdrawal</p>
            <p className="text-text-tertiary" style={{ fontSize: 12 }}>ERC-4626 vault · Base</p>
          </div>
        </div>

        {/* Liquidity warning */}
        {!liquidityOk && (
          <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'var(--danger-subtle)', border: '0.5px solid var(--danger)' }}>
            <span style={{ fontSize: 16 }}>🚫</span>
            <p style={{ fontSize: 12, color: 'var(--danger)' }}>
              Insufficient pool liquidity. Available: {fmtUsdc(payload.availableLiquidity)}. Reduce amount or try later.
            </p>
          </div>
        )}

        {/* Amount hero */}
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--warning-subtle)' }}>
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 11 }}>Withdrawing</p>
          <p className="font-mono font-bold" style={{ fontSize: 28, color: 'var(--warning)' }}>
            {fmtUsdc(payload.usdcOut)}
          </p>
          <p className="text-text-secondary mt-0.5" style={{ fontSize: 12 }}>USDC · Base</p>
        </div>

        {/* Withdrawal details */}
        <div className="surface-base p-3 rounded-xl space-y-2.5">
          <ModalRow label="Shares burned" value={payload.sharesIn} />
          <ModalRow label="USDC received" value={fmtUsdc(payload.usdcOut)} valueColor="var(--success)" />
          <ModalRow label="Pool share after" value={`${(payload.poolShareAfterBps / 100).toFixed(2)}%`} />
        </div>

        {/* Impact */}
        <div className="surface-base p-3 rounded-xl space-y-2.5">
          <p className="text-text-tertiary font-medium" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Liquidity impact
          </p>
          <ModalDivider />
          <ModalRow
            label="Available liquidity"
            value={fmtUsdc(payload.availableLiquidity)}
            valueColor={liquidityOk ? 'var(--success)' : 'var(--danger)'}
          />
          <ModalRow
            label="Utilisation impact"
            value={`+${(payload.utilizationImpactBps / 100).toFixed(1)}%`}
            valueColor={payload.utilizationImpactBps > 500 ? 'var(--warning)' : 'var(--text-primary)'}
          />
          <ModalRow
            label="Liquidity check"
            value={liquidityOk ? 'Passed ✓' : 'Failed ✗'}
            valueColor={liquidityOk ? 'var(--success)' : 'var(--danger)'}
          />
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2 pt-1">
          <ModalCta
            label={`Withdraw ${fmtUsdc(payload.usdcOut)}`}
            onClick={payload.onConfirm}
            variant="warning"
            disabled={!liquidityOk}
          />
          <ModalCta label="Cancel" onClick={onClose} variant="ghost" />
        </div>
      </ModalBody>
    </ModalShell>
  );
}
