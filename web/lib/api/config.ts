import { apiClient } from './client';
import type { PoolConfig } from '@/types/api';

export const configApi = {
  getProtocolConfig: () =>
    apiClient.get<PoolConfig>('/pool/config').then((r) => r.data),
};
