'use client';

import { useAccount } from 'wagmi';
import { ConnectPrompt } from '@/components/common/connect-prompt';
import { ScorePanel } from '@/components/borrow/score-panel';
import { CreditBar } from '@/components/borrow/credit-bar';
import { BorrowForm } from '@/components/borrow/borrow-form';
import { ActiveLoansPanel } from '@/components/borrow/active-loans-panel';
import { ScoreSignals } from '@/components/borrow/score-signals';
import Link from 'next/link';

export default function BorrowPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return <ConnectPrompt message="Connect your wallet to view your credit line and borrow." />;
  }

  return (
    <div className="container py-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Borrow</h1>
          <p className="text-text-secondary mt-0.5" style={{ fontSize: 13 }}>
            Your on-chain reputation unlocks your credit line
          </p>
        </div>
        <Link
          href="/reputation"
          className="px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          style={{ fontSize: 13, border: '0.5px solid var(--border)' }}
        >
          View reputation ↗
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-4">
          <ScorePanel wallet={address!} />
          <ScoreSignals wallet={address!} />
        </div>
        <div className="flex flex-col gap-4">
          <CreditBar wallet={address!} />
          <BorrowForm wallet={address!} />
        </div>
        <div>
          <ActiveLoansPanel wallet={address!} />
        </div>
      </div>
    </div>
  );
}
