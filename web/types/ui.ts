export type ActivityType = 'borrow' | 'repaid' | 'liquidation' | 'deposit' | 'score';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  wallet: string;
  tier?: string;
  amount?: string;
  ts: number;
  txHash?: string;
}
