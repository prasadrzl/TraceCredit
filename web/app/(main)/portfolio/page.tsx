'use client';

import { useAccount } from 'wagmi';
import { ConnectPrompt } from '@/components/common/connect-prompt';
import { NetWorthBand } from '@/components/portfolio/net-worth-band';
import { HealthCards } from '@/components/portfolio/health-cards';
import { BorrowPositions } from '@/components/portfolio/borrow-positions';
import { LpPositionCard } from '@/components/portfolio/lp-position-card';
import { ReputationSnapshot } from '@/components/portfolio/reputation-snapshot';
import { ActivityFeed } from '@/components/portfolio/activity-feed';
import { NetPositionChart } from '@/components/portfolio/net-position-chart';
import Link from 'next/link';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return <ConnectPrompt message="Connect your wallet to view your portfolio." />;
  }

  return (
    <div className="container py-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Portfolio</h1>
          <p className="text-text-secondary mt-0.5" style={{ fontSize: 13 }}>
            Your complete position across borrowing, lending, and reputation
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/borrow"
            className="px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            style={{ fontSize: 13, border: '0.5px solid var(--border)' }}
          >
            Borrow
          </Link>
          <Link
            href="/lend"
            className="px-3 py-1.5 rounded-lg text-white font-medium"
            style={{ fontSize: 13, background: 'var(--brand)' }}
          >
            Deposit
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <NetWorthBand wallet={address!} />
        <HealthCards wallet={address!} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="flex flex-col gap-4">
            <BorrowPositions wallet={address!} />
            <NetPositionChart wallet={address!} />
          </div>
          <div className="flex flex-col gap-4">
            <LpPositionCard wallet={address!} />
            <ReputationSnapshot wallet={address!} />
            <ActivityFeed wallet={address!} />
          </div>
        </div>
      </div>
    </div>
  );
}
