import type { Tier } from './api';

export type ScoreSignalType =
  | 'ON_TIME_REPAYMENT' | 'PARTIAL_REPAYMENT' | 'LATE_REPAYMENT'
  | 'DAO_VOTE' | 'CROSS_PROTOCOL_REPAYMENT' | 'ATTESTATION_RECEIVED'
  | 'WALLET_AGE' | 'KYC_VERIFIED' | 'DECAY';

export interface ScoreHeader {
  score: number;
  maxScore: number;
  tier: Tier;
  changePoints30d: number;
  description: string;
  positiveSignals30d: number;
  penalties30d: number;
  nextTier: Tier;
  nextTierScore: number;
}

export interface ScoreTrendPoint {
  date: string;
  score: number;
}

export interface SignalBreakdownItem {
  label: string;
  pct: number;
  points: number;
  color: string;
  isNegative?: boolean;
}

export interface EasAttestation {
  schema: string;
  uid: string;
  attester: string;
  recipient: string;
  evidenceHash: string;
  revocable: boolean;
  quorum: number;
  maxQuorum: number;
  rawPayload: Record<string, unknown>;
}

export interface ScoreEvent {
  id: string;
  date: string;
  block: string;
  signalType: ScoreSignalType;
  signalLabel: string;
  signalSub: string;
  source: string;
  sourceType: string;
  delta: number;
  scoreAfter: number;
  txHash: string;
  attestation?: EasAttestation;
}
