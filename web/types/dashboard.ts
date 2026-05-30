import type { Tier } from '@/types/api';
import type { ActivityType } from '@/types/ui';

export interface AtRiskPosition {
  borrower: string;
  tier: Tier;
  debt: string;
  ltv: number;
  threshold: number;
  health: number;
}

export interface BorrowersByTier {
  Diamond:  number;
  Platinum: number;
  Gold:     number;
  Silver:   number;
  Bronze:   number;
}

export interface ProtocolHealthStatus {
  name:   string;
  status: 'operational' | 'degraded' | 'down';
}

export interface ActivityItem {
  id:      string;
  type:    ActivityType;
  wallet:  string;
  tier?:   Tier;
  amount?: string;
  ts:      number;
}
