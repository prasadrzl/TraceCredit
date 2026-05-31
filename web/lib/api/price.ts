import { apiClient } from './client';
import type { PriceData } from '@/types/api';

export const priceApi = {
  getUsdcPrice: () =>
    apiClient.get<PriceData>('/price/usdc').then((r) => r.data),

  getPriceHistory: (limit = 100) =>
    apiClient.get<PriceData[]>('/price/usdc/history', { params: { limit } }).then((r) => r.data),
};
