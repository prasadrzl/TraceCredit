import type { HistorySummary, HistoryLoan, HistoryLoanState } from '@/types/history';
import { apiClient } from '@/lib/api/client';
// import mock from '../mock/history.json';

interface ApiLoan { loanId: string; borrower: string; principal: string; accruedInterest: string; dueAt: string; status: string; rateBps: number; createdAt: string; txHash?: string; }

function mapSnapshot(row: ApiLoan): HistoryLoan {
  const stateMap: Record<string, HistoryLoanState> = { active: 'Active', grace_period: 'GracePeriod', repaid: 'Repaid', defaulted: 'Defaulted', written_off: 'Defaulted' };
  const state: HistoryLoanState = stateMap[row.status] ?? 'Active';
  const principalUsd = Number(row.principal) / 1e6;
  const dueDate = new Date(Number(row.dueAt) * 1000);
  const openedDate = new Date(row.createdAt);
  return {
    loanNum: Number(row.loanId), txHash: row.txHash ?? '0x',
    openedDate: openedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    openedIso: openedDate.toISOString().slice(0, 10),
    principal: principalUsd.toFixed(0), interestPaid: (Number(row.accruedInterest) / 1e6).toFixed(2),
    interestPct: principalUsd > 0 ? (Number(row.accruedInterest) / Number(row.principal)) * 100 : 0,
    aprBps: row.rateBps, state,
    deadline: dueDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    daysLeft: state === 'Active' ? Math.max(0, Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000)) : undefined,
    graceDeadline: state === 'GracePeriod' ? dueDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : undefined,
  };
}

function summaryFromLoans(loans: HistoryLoan[]): HistorySummary {
  const totalBorrowed = loans.reduce((s, l) => s + Number(l.principal), 0);
  const totalRepaid = loans.filter(l => l.state === 'Repaid').reduce((s, l) => s + Number(l.principal), 0);
  const defaults = loans.filter(l => l.state === 'Defaulted').length;
  return {
    totalLoans: loans.length, totalBorrowed: totalBorrowed.toFixed(0), totalRepaid: totalRepaid.toFixed(0),
    repaidPct: loans.length > 0 ? (loans.filter(l => l.state === 'Repaid').length / loans.length) * 100 : 0,
    defaults, defaultRate: loans.length > 0 ? (defaults / loans.length) * 100 : 0,
  };
}

export async function getHistoryLoans(wallet: string): Promise<HistoryLoan[]> {
  // try {
    const res = await apiClient.get<ApiLoan[]>(`/positions/snapshots/${wallet}`);
    return res.data.map(mapSnapshot);
  // } catch { return mock.loans as HistoryLoan[]; }
}

export async function getHistorySummary(wallet: string): Promise<HistorySummary> {
  // try {
    const loans = await getHistoryLoans(wallet);
    return summaryFromLoans(loans);
  // } catch { return mock.summary as HistorySummary; }
}
