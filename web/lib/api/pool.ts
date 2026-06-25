import { apiClient } from './client';
import type { PoolOverview, BorrowEvent, PoolConfig } from '@/types/api';

export const poolApi = {
  getOverview: () =>
    apiClient.get<PoolOverview>('/pool/overview').then((r) => r.data),

  getConfig: () =>
    apiClient.get<PoolConfig>('/pool/config').then((r) => r.data),

  getRecentBorrows: (first = 20) =>
    apiClient.get<BorrowEvent[]>('/pool/borrows', { params: { first } }).then((r) => r.data),

  getRecentLiquidations: (first = 20) =>
    apiClient.get<BorrowEvent[]>('/pool/liquidations', { params: { first } }).then((r) => r.data),
};
