import { apiClient } from './client';
import type { LiquidationRecord, LiquidationStats } from '@/types/api';

export const liquidationApi = {
  getRecent: (limit = 50) =>
    apiClient.get<LiquidationRecord[]>('/liquidation', { params: { limit } }).then((r) => r.data),

  getStats: () =>
    apiClient.get<LiquidationStats>('/liquidation/stats').then((r) => r.data),

  getByBorrower: (wallet: string) =>
    apiClient.get<LiquidationRecord[]>(`/liquidation/${wallet}`).then((r) => r.data),
};
