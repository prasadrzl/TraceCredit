'use client';

import { useAccount } from 'wagmi';
import { ConnectPrompt } from '@/components/common/connect-prompt';
import { SbtCard } from '@/components/reputation/sbt-card';
import { ScoreArcPanel } from '@/components/reputation/score-arc-panel';
import { CreditSnapshot } from '@/components/reputation/credit-snapshot';
import { ScoreHistoryChart } from '@/components/reputation/score-history-chart';
import { SignalBreakdown } from '@/components/reputation/signal-breakdown';
import { AttestationSources } from '@/components/reputation/attestation-sources';
import { DecaySchedule } from '@/components/reputation/decay-schedule';

export default function ReputationPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return <ConnectPrompt message="Connect your wallet to view your on-chain reputation." />;
  }

  return (
    <div className="container py-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Reputation</h1>
          <p className="text-text-secondary mt-0.5" style={{ fontSize: 13 }}>
            Your on-chain identity — transparent, verifiable, non-transferable
          </p>
        </div>
        <button
          className="px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          style={{ fontSize: 13, border: '0.5px solid var(--border)' }}
        >
          How scoring works ↗
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SbtCard wallet={address!} />
          <ScoreArcPanel wallet={address!} />
          <CreditSnapshot wallet={address!} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <ScoreHistoryChart wallet={address!} />
          <div className="flex flex-col gap-4">
            <SignalBreakdown wallet={address!} />
            <AttestationSources wallet={address!} />
          </div>
        </div>

        <DecaySchedule wallet={address!} />
      </div>
    </div>
  );
}
