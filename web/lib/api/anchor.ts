import { apiClient } from './client';
import type { ComplianceStatus } from '@/types/api';

export const anchorApi = {
  getComplianceStatus: (wallet: string, country = 'US') =>
    apiClient.get<ComplianceStatus>(`/anchor/${wallet}/compliance`, { params: { country } }).then((r) => r.data),
};
