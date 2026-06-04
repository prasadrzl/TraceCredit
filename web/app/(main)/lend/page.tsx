'use client';

import { useAccount } from 'wagmi';
import { LendStatCards } from '@/components/lend/stat-cards';
import { LpPositionPanel } from '@/components/lend/lp-position-panel';
import { DepositWithdrawForm } from '@/components/lend/deposit-withdraw-form';
import { PoolUtilisationDetail } from '@/components/lend/pool-utilisation-detail';
import { YieldChart } from '@/components/lend/yield-chart';

export default function LendPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="container py-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Lend</h1>
          <p className="text-text-secondary mt-0.5" style={{ fontSize: 13 }}>
            Deposit USDC · earn yield from borrower interest · ERC-4626 vault
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-text-tertiary" style={{ fontSize: 12 }}>
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          Base
        </div>
      </div>

      <div className="space-y-4">
        <LendStatCards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isConnected && address ? (
            <LpPositionPanel wallet={address} />
          ) : (
            <div className="card-base flex items-center justify-center py-10 text-text-tertiary" style={{ fontSize: 13 }}>
              Connect wallet to view your LP position
            </div>
          )}
          <DepositWithdrawForm wallet={address} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PoolUtilisationDetail />
          <YieldChart />
        </div>
      </div>
    </div>
  );
}
