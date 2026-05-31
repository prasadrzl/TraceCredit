import { apiClient } from './client';
import type { BorrowerPositions, Loan } from '@/types/api';

export const positionsApi = {
  getBorrowerPositions: (wallet: string) =>
    apiClient.get<BorrowerPositions>(`/positions/${wallet}`).then((r) => r.data),

  getLoanDetail: (loanId: string) =>
    apiClient.get<Loan>(`/positions/loan/${loanId}`).then((r) => r.data),
};
