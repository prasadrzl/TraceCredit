'use client';

import { ModalShell, ModalBody } from './modal-shell';
import type { TxPendingPayload } from '@/store/tx-modal-store';

const STEPS = ['signing', 'submitted', 'confirming'] as const;

const STEP_LABEL: Record<typeof STEPS[number], string> = {
  signing:    'Waiting for wallet signature…',
  submitted:  'Transaction submitted to Base…',
  confirming: 'Waiting for block confirmation…',
};

interface Props { payload: TxPendingPayload }

export function TxPendingModal({ payload }: Props) {
  const currentIdx = STEPS.indexOf(payload.step);

  return (
    <ModalShell closeable={false}>
      <ModalBody>
        {/* Spinner */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative h-14 w-14">
            <svg className="absolute inset-0 animate-spin" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="24" stroke="var(--bg-surface)" strokeWidth="4" />
              <path
                d="M28 4 A24 24 0 0 1 52 28"
                stroke="var(--brand)"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span style={{ fontSize: 22 }}>⏳</span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="font-semibold text-text-primary" style={{ fontSize: 16 }}>
              Transaction in progress
            </p>
            <p className="text-text-secondary" style={{ fontSize: 13 }}>{payload.description}</p>
          </div>
        </div>

        {/* Step tracker */}
        <div className="space-y-2">
          {STEPS.map((step, i) => {
            const done    = i < currentIdx;
            const active  = i === currentIdx;
            const pending = i > currentIdx;
            return (
              <div key={step} className="flex items-center gap-3">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 font-mono font-bold"
                  style={{
                    fontSize: 11,
                    background: done   ? 'var(--success)'        :
                                active ? 'var(--brand)'          : 'var(--bg-surface)',
                    color:      done   ? '#fff'                  :
                                active ? '#fff'                  : 'var(--text-tertiary)',
                    border:     pending ? '0.5px solid var(--border)' : 'none',
                  }}
                >
                  {done ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <p
                    className="font-medium"
                    style={{
                      fontSize: 13,
                      color: done ? 'var(--success)' : active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    }}
                  >
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </p>
                  {active && (
                    <p className="text-text-tertiary" style={{ fontSize: 11 }}>{STEP_LABEL[step]}</p>
                  )}
                </div>
                {active && (
                  <span className="h-2 w-2 rounded-full animate-pulse shrink-0" style={{ background: 'var(--brand)' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Tx hash */}
        {payload.txHash && (
          <div
            className="rounded-lg px-3 py-2 flex items-center justify-between gap-2"
            style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
          >
            <span className="text-text-tertiary" style={{ fontSize: 11 }}>Tx hash</span>
            <span className="font-mono text-text-secondary" style={{ fontSize: 11 }}>
              {payload.txHash.slice(0, 10)}…{payload.txHash.slice(-8)}
            </span>
          </div>
        )}

        <p className="text-center text-text-tertiary" style={{ fontSize: 11 }}>
          Do not close this window
        </p>
      </ModalBody>
    </ModalShell>
  );
}
