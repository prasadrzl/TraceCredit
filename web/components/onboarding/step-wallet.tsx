'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface Props { onConnected: () => void; onBack: () => void }

export function StepWallet({ onConnected, onBack }: Props) {
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected) onConnected();
  }, [isConnected, onConnected]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-1">
          <span className="font-semibold text-text-primary" style={{ fontSize: 15 }}>TraceCredit</span>
          <h2 className="font-bold text-text-primary mt-4" style={{ fontSize: 22 }}>Connect your wallet</h2>
          <p className="text-text-secondary" style={{ fontSize: 13 }}>Connect to start borrowing against your reputation</p>
        </div>

        <div className="flex justify-center">
          <ConnectButton />
        </div>

        <button
          onClick={onBack}
          className="w-full text-center text-text-tertiary hover:text-text-secondary transition-colors"
          style={{ fontSize: 13 }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
