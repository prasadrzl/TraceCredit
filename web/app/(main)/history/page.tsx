'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useHistorySummary, useHistoryLoans } from '@/hooks/use-history';
import { HistoryStatCards } from '@/components/history/history-stat-cards';
import { LoanTable } from '@/components/history/loan-table';

const MOCK_WALLET = '0x3f2a9c14';

export default function HistoryPage() {
  const router = useRouter();
  const { data: summary } = useHistorySummary(MOCK_WALLET);
  const { data: loans }   = useHistoryLoans(MOCK_WALLET);

  return (
    <div className="container py-6 space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-text-primary" style={{ fontSize: 22 }}>History</h1>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 13 }}>Your complete loan and transaction record</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--success-subtle)', border: '0.5px solid var(--success)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            <span className="font-mono text-text-secondary" style={{ fontSize: 12 }}>Wallet 0x3f2a…9c14</span>
          </div>
          <Link href="/borrow" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-white" style={{ background: 'var(--brand)', fontSize: 13 }}>
            <Plus className="h-3.5 w-3.5" /> New loan
          </Link>
        </div>
      </div>

      {summary && <HistoryStatCards summary={summary} />}

      {loans && (
        <LoanTable
          loans={loans}
          onLoanClick={(loanNum) => router.push(`/history/${loanNum}`)}
        />
      )}
    </div>
  );
}
