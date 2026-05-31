import { apiClient } from './client';
import type { WalletScore, ScoreHistoryItem } from '@/types/api';

export const scoreApi = {
  getWalletScore: (wallet: string) =>
    apiClient.get<WalletScore>(`/score/${wallet}`).then((r) => r.data),

  getScoreHistory: (wallet: string, limit = 50) =>
    apiClient.get<ScoreHistoryItem[]>(`/score/${wallet}/history`, { params: { limit } }).then((r) => r.data),
};
