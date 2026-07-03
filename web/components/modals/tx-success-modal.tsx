'use client';

import { useRouter } from 'next/navigation';
import { useChainId } from 'wagmi';
import { ModalShell, ModalBody, ModalRow, ModalDivider, ModalCta } from './modal-shell';
import type { TxSuccessPayload } from '@/store/tx-modal-store';
import { getTxUrl } from '@/lib/wagmi/explorer';

interface Props { payload: TxSuccessPayload; onClose: () => void }

export function TxSuccessModal({ payload, onClose }: Props) {
  const router = useRouter();
  const chainId = useChainId();

  const handleCta = () => {
    onClose();
    if (payload.ctaHref) router.push(payload.ctaHref);
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalBody>
        {/* Success animation */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--success-subtle)', border: '2px solid var(--success)' }}
          >
            <span style={{ fontSize: 30 }}>🎉</span>
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-text-primary" style={{ fontSize: 18 }}>Transaction confirmed!</p>
            <p className="text-text-secondary" style={{ fontSize: 13 }}>{payload.description}</p>
          </div>
        </div>

        {/* Score update */}
        {payload.scoreChange !== undefined && payload.newScore !== undefined && (
          <div
            className="rounded-xl p-3 space-y-2.5"
            style={{ background: 'var(--success-subtle)', border: '0.5px solid var(--success)' }}
          >
            <p className="font-medium" style={{ fontSize: 12, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Reputation updated
            </p>
            <ModalDivider />
            <ModalRow
              label="Score change"
              value={`${payload.scoreChange >= 0 ? '+' : ''}${payload.scoreChange} pts`}
              valueColor={payload.scoreChange >= 0 ? 'var(--success)' : 'var(--danger)'}
            />
            <ModalRow
              label="New score"
              value={String(payload.newScore)}
            />
          </div>
        )}

        {/* Tx hash */}
        <div
          className="rounded-lg px-3 py-2 flex items-center justify-between gap-2"
          style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
        >
          <span className="text-text-tertiary" style={{ fontSize: 11 }}>Tx hash</span>
          <a
            href={getTxUrl(chainId, payload.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:underline"
            style={{ fontSize: 11, color: 'var(--brand)' }}
          >
            {payload.txHash.slice(0, 10)}…{payload.txHash.slice(-8)} ↗
          </a>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2 pt-1">
          {payload.ctaLabel && <ModalCta label={payload.ctaLabel} onClick={handleCta} />}
          <ModalCta label="Close" onClick={onClose} variant="ghost" />
        </div>
      </ModalBody>
    </ModalShell>
  );
}
