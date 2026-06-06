import { useQuery } from '@tanstack/react-query';
import { getLoanDetail, getLoanInterest, getLoanRepayments, getLoanScoreImpact } from '@/lib/data/loan-detail';
import { REFETCH_INTERVALS } from '@/lib/constants';

export const useLoanDetail = (loanNum: number) => useQuery({
  queryKey: ['loan-detail', loanNum],
  queryFn: () => getLoanDetail(loanNum),
  staleTime: REFETCH_INTERVALS.loanDetail,
  refetchInterval: REFETCH_INTERVALS.loanDetail,
});

export const useLoanInterest = (loanNum: number) => useQuery({
  queryKey: ['loan-detail', 'interest', loanNum],
  queryFn: () => getLoanInterest(loanNum),
  staleTime: REFETCH_INTERVALS.health,
  refetchInterval: REFETCH_INTERVALS.health,
});

export const useLoanRepayments = (loanNum: number) => useQuery({
  queryKey: ['loan-detail', 'repayments', loanNum],
  queryFn: () => getLoanRepayments(loanNum),
  staleTime: REFETCH_INTERVALS.loanDetail,
});

export const useLoanScoreImpact = (loanNum: number) => useQuery({
  queryKey: ['loan-detail', 'score-impact', loanNum],
  queryFn: () => getLoanScoreImpact(loanNum),
  staleTime: REFETCH_INTERVALS.history,
});
