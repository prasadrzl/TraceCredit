import { apiClient } from './client';
import type { VaultStats, SharesValue } from '@/types/api';

export const vaultApi = {
  getStats: () =>
    apiClient.get<VaultStats>('/vault/stats').then((r) => r.data),

  getSharesValue: (wallet: string) =>
    apiClient.get<SharesValue>(`/vault/shares/${wallet}`).then((r) => r.data),
};
