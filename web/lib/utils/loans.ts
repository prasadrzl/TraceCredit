export type LoanState = 'Active' | 'GracePeriod' | 'Defaulted' | 'WrittenOff' | 'Repaid';

export const LOAN_STATE_LABELS: Record<number, LoanState> = {
  0: 'Active',
  1: 'GracePeriod',
  2: 'Defaulted',
  3: 'WrittenOff',
  4: 'Repaid',
};

export const LOAN_STATE_COLOURS: Record<LoanState, string> = {
  Active: 'text-green-600',
  GracePeriod: 'text-amber-600',
  Defaulted: 'text-red-600',
  WrittenOff: 'text-gray-400',
  Repaid: 'text-gray-500',
};

export const LOAN_STATE_BG: Record<LoanState, string> = {
  Active: 'bg-green-50 text-green-700 border-green-200',
  GracePeriod: 'bg-amber-50 text-amber-700 border-amber-200',
  Defaulted: 'bg-red-50 text-red-700 border-red-200',
  WrittenOff: 'bg-gray-100 text-gray-500 border-gray-200',
  Repaid: 'bg-gray-50 text-gray-500 border-gray-200',
};

export function isActiveState(state: LoanState): boolean {
  return state === 'Active' || state === 'GracePeriod';
}

export function daysRemaining(deadlineTs: number): number {
  return Math.floor((deadlineTs - Date.now() / 1000) / 86400);
}
