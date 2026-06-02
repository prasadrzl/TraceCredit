'use client';

import { useEffect, useState } from 'react';
import { useConnect, useAccount } from 'wagmi';

interface Props { onConnected: () => void; onBack: () => void }

const CONNECTOR_META: Record<string, { icon: string; color: string }> = {
  MetaMask:        { icon: '🦊', color: '#F6851B' },
  WalletConnect:   { icon: '🔗', color: '#3B99FC' },
  'Coinbase Wallet':{ icon: '🟦', color: '#0052FF' },
  Injected:        { icon: '🌐', color: 'var(--brand)' },
};

export function StepWallet({ onConnected, onBack }: Props) {
  const { connect, connectors, isPending, error } = useConnect();
  const { isConnected } = useAccount();
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) onConnected();
  }, [isConnected, onConnected]);

  const handleConnect = (connector: typeof connectors[number]) => {
    setConnecting(connector.uid);
    connect({ connector });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <span className="font-semibold text-text-primary" style={{ fontSize: 15 }}>TraceCredit</span>
          <h2 className="font-bold text-text-primary mt-4" style={{ fontSize: 22 }}>Connect your wallet</h2>
          <p className="text-text-secondary" style={{ fontSize: 13 }}>Connect to TraceCredit</p>
        </div>

        {/* Wallet list */}
        <div className="card-base p-0 overflow-hidden divide-y divide-[var(--border)]">
          {connectors.map((connector) => {
            const meta = CONNECTOR_META[connector.name] ?? { icon: '💼', color: 'var(--brand)' };
            const isLoading = connecting === connector.uid && isPending;
            return (
              <button
                key={connector.uid}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-surface transition-colors disabled:opacity-50 text-left"
              >
                <span
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                  style={{ background: `${meta.color}18`, border: `0.5px solid ${meta.color}30` }}
                >
                  {meta.icon}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-text-primary" style={{ fontSize: 14 }}>{connector.name}</p>
                  {connector.name === 'MetaMask' && (
                    <p className="text-text-tertiary" style={{ fontSize: 11 }}>Detected · Browser extension</p>
                  )}
                </div>
                {isLoading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
                ) : (
                  <span className="text-text-tertiary" style={{ fontSize: 18 }}>›</span>
                )}
              </button>
            );
          })}

          {/* More options placeholder */}
          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-surface transition-colors text-left">
            <span className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
              ···
            </span>
            <div className="flex-1">
              <p className="font-medium text-text-secondary" style={{ fontSize: 14 }}>More options</p>
              <p className="text-text-tertiary" style={{ fontSize: 11 }}>WalletConnect · Any wallet</p>
            </div>
            <span className="text-text-tertiary" style={{ fontSize: 18 }}>›</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl p-3" style={{ background: 'var(--danger-subtle)', border: '0.5px solid var(--danger)' }}>
            <p style={{ fontSize: 12, color: 'var(--danger)' }}>{error.message}</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-text-tertiary" style={{ fontSize: 11 }}>
          By connecting you agree to{' '}
          <span className="underline cursor-pointer hover:text-text-secondary">Terms</span>
          {' · '}
          <span className="underline cursor-pointer hover:text-text-secondary">Privacy</span>
        </p>

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
