'use client';

import { ModalShell, ModalBody, ModalCta } from './modal-shell';
import type { TxFailedPayload } from '@/store/tx-modal-store';

const GAS_ERRORS = ['out of gas', 'gas', 'fee'];

interface Props { payload: TxFailedPayload; onClose: () => void }

export function TxFailedModal({ payload, onClose }: Props) {
  const isGasError = GAS_ERRORS.some((k) => payload.error.toLowerCase().includes(k));

  return (
    <ModalShell onClose={onClose}>
      <ModalBody>
        {/* Error icon */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--danger-subtle)', border: '2px solid var(--danger)' }}
          >
            <span style={{ fontSize: 30 }}>❌</span>
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-text-primary" style={{ fontSize: 18 }}>Transaction failed</p>
            <p className="text-text-secondary" style={{ fontSize: 13 }}>{payload.description}</p>
          </div>
        </div>

        {/* Error details */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ background: 'var(--danger-subtle)', border: '0.5px solid var(--danger)' }}
        >
          <p className="font-medium" style={{ fontSize: 11, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Error reason
          </p>
          <p className="font-mono break-all" style={{ fontSize: 12, color: 'var(--danger)' }}>
            {payload.error}
          </p>
        </div>

        {/* Gas suggestion */}
        {(isGasError || payload.gasHint) && (
          <div
            className="rounded-xl p-3 flex items-start gap-2"
            style={{ background: 'var(--warning-subtle)', border: '0.5px solid var(--warning)' }}
          >
            <span style={{ fontSize: 16 }}>⛽</span>
            <div className="space-y-0.5">
              <p className="font-medium" style={{ fontSize: 12, color: 'var(--warning)' }}>Gas suggestion</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {payload.gasHint ?? 'Try increasing gas limit by 20% or wait for lower network congestion.'}
              </p>
            </div>
          </div>
        )}

        {/* General hint if not gas */}
        {!isGasError && !payload.gasHint && (
          <div
            className="rounded-lg px-3 py-2"
            style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
          >
            <p className="text-text-secondary" style={{ fontSize: 12 }}>
              Check your wallet connection and balance, then try again. If this keeps happening, contact support.
            </p>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-2 pt-1">
          {payload.canRetry && payload.onRetry && (
            <ModalCta label="Retry transaction" onClick={payload.onRetry} variant="danger" />
          )}
          <ModalCta label="Close" onClick={onClose} variant="ghost" />
        </div>
      </ModalBody>
    </ModalShell>
  );
}
