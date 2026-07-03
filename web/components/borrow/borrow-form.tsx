'use client';

import { useState } from 'react';
import { UsdcAmount } from '@/components/common/usdc-amount';
import { Skeleton } from '@/components/ui/skeleton';
import { useBorrowerProfile } from '@/hooks/use-borrow';
import { useTxModal } from '@/store/tx-modal-store';
import { useBorrowWrite } from '@/hooks/use-protocol-write';

interface Props { wallet: string }

export function BorrowForm({ wallet }: Props) {
  const { data, isLoading } = useBorrowerProfile(wallet);
  const [amount, setAmount] = useState('');
  const { open } = useTxModal();
  const borrowWrite = useBorrowWrite();

  if (isLoading || !data) {
    return (
      <div className="card-base space-y-3">
        <Skeleton className="h-5 w-28 bg-bg-surface" />
        <Skeleton className="h-12 w-full bg-bg-surface" />
        <Skeleton className="h-10 w-full bg-bg-surface" />
      </div>
    );
  }

  const available = Number(data.creditAvailable) / 1_000_000;
  const inputVal  = Number(amount) || 0;
  const isOverLimit = inputVal > available;
  const interest  = (inputVal * (data.interestRateBps / 10000) * 30 / 365).toFixed(2);
  const rawAmount = String(Math.round(inputVal * 1_000_000));

  const handleBorrow = () => {
    open({
      type:        'borrow-confirm',
      amount:      rawAmount,
      aprBps:      data.interestRateBps,
      deadlineDays: 30,
      creditLimit: data.creditLimit,
      creditUsed:  data.creditUsed,
      score:       data.score,
      scorePreview: data.score,
      tier:        data.tier,
      onConfirm: () => {
        borrowWrite(BigInt(rawAmount), `Borrowing $${inputVal.toFixed(2)} USDC`).catch(() => {});
      },
    });
  };

  return (
    <div className="card-base space-y-4">
      <span className="text-base font-medium text-text-primary">New Borrow</span>

      <div>
        <label className="text-text-secondary block mb-1.5" style={{ fontSize: 12 }}>Amount (USDC)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" style={{ fontSize: 13 }}>$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min={0}
            max={available}
            className="w-full pl-6 pr-16 py-2.5 rounded-lg text-text-primary bg-bg-surface font-mono outline-none focus:ring-1 focus:ring-[var(--brand)]"
            style={{ fontSize: 15, border: '0.5px solid var(--border)' }}
          />
          <button
            onClick={() => setAmount(available.toFixed(2))}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-medium hover:opacity-80 transition-opacity"
            style={{ fontSize: 11, color: 'var(--brand)' }}
          >
            MAX
          </button>
        </div>
        {isOverLimit && (
          <p className="mt-1" style={{ fontSize: 11, color: 'var(--danger)' }}>
            Exceeds available credit of ${available.toFixed(2)}
          </p>
        )}
      </div>

      {inputVal > 0 && !isOverLimit && (
        <div className="surface-base p-3 rounded-lg space-y-1.5">
          <div className="flex justify-between">
            <span className="text-text-tertiary" style={{ fontSize: 12 }}>APR</span>
            <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>{(data.interestRateBps / 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary" style={{ fontSize: 12 }}>30-day interest</span>
            <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>${interest}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary" style={{ fontSize: 12 }}>Network</span>
            <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>Optimism</span>
          </div>
        </div>
      )}

      <button
        onClick={handleBorrow}
        disabled={!inputVal || isOverLimit}
        className="w-full py-2.5 rounded-lg font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-90"
        style={{ background: 'var(--brand)', fontSize: 14 }}
      >
        Borrow USDC
      </button>

      <p className="text-text-tertiary text-center" style={{ fontSize: 11 }}>
        Available: <UsdcAmount raw={data.creditAvailable} compact /> · APR {(data.interestRateBps / 100).toFixed(1)}%
      </p>
    </div>
  );
}
