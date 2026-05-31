import { apiClient } from './client';
import type { BridgeConfig, AttestationHistoryItem } from '@/types/api';

export const attestationApi = {
  getConfig: () =>
    apiClient.get<BridgeConfig>('/attestation/config').then((r) => r.data),

  getHistory: (wallet: string) =>
    apiClient.get<AttestationHistoryItem[]>(`/attestation/${wallet}/history`).then((r) => r.data),
};
