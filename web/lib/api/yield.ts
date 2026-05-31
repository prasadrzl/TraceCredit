import { apiClient } from './client';
import type { ApyStats, PendingYield } from '@/types/api';

export const yieldApi = {
  getApyStats: () =>
    apiClient.get<ApyStats>('/yield/apy').then((r) => r.data),

  getPendingYield: (wallet: string) =>
    apiClient.get<PendingYield>(`/yield/pending/${wallet}`).then((r) => r.data),
};
