import { apiClient } from './client';
import type { ProtocolStats, DailyVolume } from '@/types/api';

export const analyticsApi = {
  getProtocolStats: () =>
    apiClient.get<ProtocolStats>('/analytics/protocol').then((r) => r.data),

  getVolume: (days = 7) =>
    apiClient.get<DailyVolume[]>('/analytics/volume', { params: { days } }).then((r) => r.data),
};
