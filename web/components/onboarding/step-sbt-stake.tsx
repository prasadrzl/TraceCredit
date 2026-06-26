'use client';

import { useState } from 'react';
import { OnboardingShell } from './onboarding-shell';
import { useTxModal } from '@/store/tx-modal-store';
import { useProtocolConfig, PROTOCOL_CONFIG_DEFAULTS } from '@/hooks/use-config';

interface Props { onNext: () => void; onBack: () => void }

export function StepSbtStake({ onNext, onBack }: Props) {
  const [approved, setApproved] = useState(false);
  const { open, transitionTo } = useTxModal();
  const { data: cfg } = useProtocolConfig();
  const STAKE_AMOUNT = cfg?.sbtStakeUsdc ?? PROTOCOL_CONFIG_DEFAULTS.sbtStakeUsdc;
  const UNLOCK_DAYS = cfg?.sbtUnlockDays ?? PROTOCOL_CONFIG_DEFAULTS.sbtUnlockDays;

  const handleApprove = () => {
    open({
      type:        'tx-pending',
      description: `Approving ${STAKE_AMOUNT} USDC for SBT mint stake`,
      step:        'signing',
    });
    setTimeout(() => transitionTo({ type: 'tx-pending', description: `Approving ${STAKE_AMOUNT} USDC`, step: 'submitted',  txHash: '0xaaa111bbb222' }), 1000);
    setTimeout(() => transitionTo({ type: 'tx-pending', description: `Approving ${STAKE_AMOUNT} USDC`, step: 'confirming', txHash: '0xaaa111bbb222' }), 2400);
    setTimeout(() => {
      setApproved(true);
      const { close } = useTxModal.getState();
      close();
    }, 3600);
  };

  const handleMint = () => {
    open({
      type:        'tx-pending',
      description: 'Minting your SBT on Base…',
      step:        'signing',
    });
    setTimeout(() => transitionTo({ type: 'tx-pending', description: 'Minting your SBT on Base…', step: 'submitted',  txHash: '0xccc333ddd444' }), 1000);
    setTimeout(() => transitionTo({ type: 'tx-pending', description: 'Minting your SBT on Base…', step: 'confirming', txHash: '0xccc333ddd444' }), 2400);
    setTimeout(() => {
      const { close } = useTxModal.getState();
      close();
      onNext();
    }, 3800);
  };

  return (
    <OnboardingShell step={2} totalSteps={3} title="Lock your mint stake" onBack={onBack}>
      <p className="text-text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
        A <span className="font-medium text-text-primary">${STAKE_AMOUNT} USDC</span> stake is required to mint your SBT.
        This stake is locked for 30 days and unlocks your SBT after minting — it acts as a
        skin-in-the-game deposit, not a fee.
      </p>

      {/* Stake amount display */}
      <div
        className="rounded-2xl p-5 flex flex-col items-center gap-1"
        style={{ background: 'var(--brand-subtle)', border: '0.5px solid var(--brand)' }}
      >
        <p className="text-text-secondary" style={{ fontSize: 12 }}>Stake amount</p>
        <p className="font-mono font-bold text-text-primary" style={{ fontSize: 42 }}>{STAKE_AMOUNT}</p>
        <p className="font-medium" style={{ fontSize: 14, color: 'var(--brand)' }}>USDC</p>
      </div>

      {/* Stake breakdown */}
      <div className="surface-base p-3 rounded-xl space-y-2.5">
        {[
          { label: 'Your SBT balance',  value: '$0.00 USDC',    note: '' },
          { label: 'Mint cost',         value: `$${STAKE_AMOUNT} USDC`, note: 'locked, not burned' },
          { label: 'SBT status',        value: 'Permanent',     note: '' },
          { label: 'Unlock delay',      value: `${UNLOCK_DAYS} days`, note: 'after minting' },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-text-secondary" style={{ fontSize: 13 }}>{row.label}</span>
            <span className="font-mono font-medium text-text-primary" style={{ fontSize: 13 }}>
              {row.value}
              {row.note && <span className="ml-1 font-normal text-text-tertiary" style={{ fontSize: 11 }}>· {row.note}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Approve toggle */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ border: '0.5px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-2">
          <span
            className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: approved ? 'var(--success)' : 'var(--bg-card)', border: `0.5px solid ${approved ? 'var(--success)' : 'var(--border)'}`, color: approved ? '#fff' : 'var(--text-tertiary)' }}
          >
            {approved ? '✓' : '1'}
          </span>
          <span className="text-text-secondary" style={{ fontSize: 13 }}>Approve {STAKE_AMOUNT} USDC</span>
        </div>
        {!approved && (
          <button
            onClick={handleApprove}
            className="px-3 py-1 rounded-md font-medium text-white text-xs"
            style={{ background: 'var(--brand)', fontSize: 12 }}
          >
            Approve
          </button>
        )}
        {approved && <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>Done ✓</span>}
      </div>

      {/* Warning */}
      <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'var(--warning-subtle)', border: '0.5px solid var(--warning)' }}>
        <span style={{ fontSize: 14 }}>⚠️</span>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          We warrant the {STAKE_AMOUNT} USDC stake is locked in our stake vault for {UNLOCK_DAYS} days.
          It will be fully returned to your wallet after the unlock period. It does not count as collateral.
        </p>
      </div>

      <button
        onClick={approved ? handleMint : handleApprove}
        className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
        style={{ background: 'var(--brand)', fontSize: 14 }}
      >
        {approved ? `Mint SBT (${STAKE_AMOUNT} USDC staked)` : `Approve ${STAKE_AMOUNT} USDC`}
      </button>
    </OnboardingShell>
  );
}
