import { apiClient } from './client';
import type { CreditLine, RateLimitStatus } from '@/types/api';

export const creditApi = {
  getCreditLine: (wallet: string) =>
    apiClient.get<CreditLine>(`/credit/${wallet}/line`).then((r) => r.data),

  getRateLimitStatus: (wallet: string, tier = 0) =>
    apiClient.get<RateLimitStatus>(`/credit/${wallet}/rate-limit`, { params: { tier } }).then((r) => r.data),
};
