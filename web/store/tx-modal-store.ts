import { create } from 'zustand';

// ── Payload types ─────────────────────────────────────────────────────────────

export interface BorrowConfirmPayload {
  type: 'borrow-confirm';
  amount: string;         // raw USDC (6 decimals)
  aprBps: number;
  deadlineDays: number;
  creditLimit: string;
  creditUsed: string;
  score: number;
  scorePreview: number;   // score after taking loan (no change until repay)
  tier: string;
  onConfirm: () => void;
}

export interface RepayConfirmPayload {
  type: 'repay-confirm';
  loanId: string;
  amount: string;         // raw USDC
  isGrace: boolean;
  scoreGain: number;
  currentScore: number;
  newScore: number;
  creditRestored: string;
  onConfirm: () => void;
}

export interface DepositConfirmPayload {
  type: 'deposit-confirm';
  usdcIn: string;         // raw USDC
  sharesOut: string;      // formatted shares
  poolShareBps: number;
  apyBps: number;
  sharePrice: string;
  onConfirm: () => void;
}

export interface WithdrawConfirmPayload {
  type: 'withdraw-confirm';
  sharesIn: string;
  usdcOut: string;        // raw USDC
  poolShareAfterBps: number;
  availableLiquidity: string;
  utilizationImpactBps: number;
  onConfirm: () => void;
}

export interface TxPendingPayload {
  type: 'tx-pending';
  description: string;
  txHash?: string;
  step: 'signing' | 'submitted' | 'confirming';
}

export interface TxSuccessPayload {
  type: 'tx-success';
  description: string;
  txHash: string;
  scoreChange?: number;
  newScore?: number;
  ctaLabel: string;
  ctaHref: string;
}

export interface TxFailedPayload {
  type: 'tx-failed';
  description: string;
  error: string;
  canRetry: boolean;
  gasHint?: string;
  onRetry?: () => void;
}

export type TxModalPayload =
  | BorrowConfirmPayload
  | RepayConfirmPayload
  | DepositConfirmPayload
  | WithdrawConfirmPayload
  | TxPendingPayload
  | TxSuccessPayload
  | TxFailedPayload;

// ── Store ─────────────────────────────────────────────────────────────────────

interface TxModalStore {
  modal: TxModalPayload | null;
  open: (payload: TxModalPayload) => void;
  close: () => void;
  transitionTo: (payload: TxModalPayload) => void; // replace without close animation
}

export const useTxModal = create<TxModalStore>((set) => ({
  modal: null,
  open:         (modal)   => set({ modal }),
  close:        ()        => set({ modal: null }),
  transitionTo: (modal)   => set({ modal }),
}));
