'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useHistorySummary, useHistoryLoans } from '@/hooks/use-history';
import { HistoryStatCards } from '@/components/history/history-stat-cards';
import { LoanTable } from '@/components/history/loan-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function HistoryPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const wallet = address ?? '';

  const { data: summary, isLoading: sl } = useHistorySummary(wallet);
  const { data: loans,   isLoading: ll } = useHistoryLoans(wallet);

  const shortWallet = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : 'Not connected';

  return (
    <div className="container py-6 space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-text-primary" style={{ fontSize: 22 }}>History</h1>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 13 }}>Your complete loan and transaction record</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--success-subtle)', border: '0.5px solid var(--success)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              <span className="font-mono text-text-secondary" style={{ fontSize: 12 }}>Wallet {shortWallet}</span>
            </div>
          )}
          <Link href="/borrow" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-white" style={{ background: 'var(--brand)', fontSize: 13 }}>
            <Plus className="h-3.5 w-3.5" /> New loan
          </Link>
        </div>
      </div>

      {/* Stat cards — skeleton while loading */}
      {sl ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 bg-bg-surface" />)}
        </div>
      ) : summary ? (
        <HistoryStatCards summary={summary} />
      ) : null}

      {/* Loan table — always rendered, empty state handled inside */}
      {ll ? (
        <div className="card-base space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 bg-bg-surface" />)}
        </div>
      ) : (
        <LoanTable
          loans={loans ?? []}
          onLoanClick={(loanNum) => router.push(`/history/${loanNum}`)}
        />
      )}
    </div>
  );
}
