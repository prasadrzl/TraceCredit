'use client';

import { useState } from 'react';
import { UsdcAmount } from '@/components/common/usdc-amount';
import { usePoolStats, useApyBreakdown } from '@/hooks/use-lend';
import { useTxModal } from '@/store/tx-modal-store';

interface Props { wallet: string | undefined }

type Tab = 'deposit' | 'withdraw';

export function DepositWithdrawForm({ wallet }: Props) {
  const [tab, setTab]     = useState<Tab>('deposit');
  const [amount, setAmount] = useState('');
  const { data: pool }    = usePoolStats();
  const { data: apy }     = useApyBreakdown();
  const { open, transitionTo } = useTxModal();

  const inputVal   = Number(amount) || 0;
  const sharePriceRaw = Number(pool?.sharePrice ?? '1000000');
  const sharesOut  = inputVal > 0 ? (inputVal / (sharePriceRaw / 1_000_000)).toFixed(4) : '0';
  const usdcOut    = inputVal > 0 ? String(Math.round(inputVal * sharePriceRaw)) : '0';
  const grossApy   = apy ? (apy.grossApyBps / 100).toFixed(2) : '—';
  const netApy     = apy ? (apy.netLpApyBps / 100).toFixed(2) : '—';
  const rawAmount  = String(Math.round(inputVal * 1_000_000));

  const handleDeposit = () => {
    if (!inputVal || !pool || !apy) return;
    open({
      type:        'deposit-confirm',
      usdcIn:      rawAmount,
      sharesOut,
      poolShareBps: Math.round((inputVal / (Number(pool.tvl) / 1_000_000)) * 10000),
      apyBps:      apy.netLpApyBps,
      sharePrice:  pool.sharePrice,
      onConfirm: () => {
        transitionTo({ type: 'tx-pending', description: `Depositing $${inputVal.toFixed(2)} USDC`, step: 'signing' });
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Depositing $${inputVal.toFixed(2)} USDC`, step: 'submitted',  txHash: '0xfed123cba456' }), 1200);
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Depositing $${inputVal.toFixed(2)} USDC`, step: 'confirming', txHash: '0xfed123cba456' }), 2800);
        setTimeout(() => transitionTo({
          type:        'tx-success',
          description: `${sharesOut} LP shares minted · Earning ${netApy}% APY`,
          txHash:      '0xfed123cba456',
          ctaLabel:    'View LP Position',
          ctaHref:     '/lend',
        }), 4400);
      },
    });
  };

  const handleWithdraw = () => {
    if (!inputVal || !pool) return;
    open({
      type:               'withdraw-confirm',
      sharesIn:           inputVal.toFixed(4),
      usdcOut,
      poolShareAfterBps:  Math.max(0, (Number(pool.sharesOutstanding) - inputVal * 1e12) / Number(pool.sharesOutstanding) * 2080),
      availableLiquidity: String(Math.round(Number(pool.tvl) * (1 - pool.utilisationBps / 10000))),
      utilizationImpactBps: Math.round((inputVal / (Number(pool.tvl) / 1_000_000)) * 10000),
      onConfirm: () => {
        transitionTo({ type: 'tx-pending', description: `Withdrawing ${inputVal.toFixed(4)} shares`, step: 'signing' });
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Withdrawing ${inputVal.toFixed(4)} shares`, step: 'submitted',  txHash: '0x789xyz012' }), 1200);
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Withdrawing ${inputVal.toFixed(4)} shares`, step: 'confirming', txHash: '0x789xyz012' }), 2800);
        setTimeout(() => transitionTo({
          type:        'tx-success',
          description: `Withdrawal complete · USDC returned to wallet`,
          txHash:      '0x789xyz012',
          ctaLabel:    'View Portfolio',
          ctaHref:     '/portfolio',
        }), 4400);
      },
    });
  };

  return (
    <div className="card-base space-y-4">
      {/* Tab switcher */}
      <div className="flex rounded-lg overflow-hidden" style={{ border: '0.5px solid var(--border)' }}>
        {(['deposit', 'withdraw'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setAmount(''); }}
            className="flex-1 py-2 text-sm font-medium capitalize transition-colors"
            style={{
              background: tab === t ? 'var(--brand)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-secondary)',
              fontSize: 13,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <label className="text-text-secondary block mb-1.5" style={{ fontSize: 12 }}>
          {tab === 'deposit' ? 'USDC amount' : 'Shares to redeem'}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" style={{ fontSize: 13 }}>
            {tab === 'deposit' ? '$' : '◈'}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min={0}
            className="w-full pl-6 pr-4 py-2.5 rounded-lg text-text-primary bg-bg-surface font-mono outline-none focus:ring-1 focus:ring-[var(--brand)]"
            style={{ fontSize: 15, border: '0.5px solid var(--border)' }}
          />
        </div>
      </div>

      {inputVal > 0 && (
        <div className="surface-base p-3 rounded-lg space-y-1.5">
          {tab === 'deposit' ? (
            <>
              <div className="flex justify-between">
                <span className="text-text-tertiary" style={{ fontSize: 12 }}>Shares received</span>
                <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>{sharesOut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary" style={{ fontSize: 12 }}>Gross APY</span>
                <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>{grossApy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary" style={{ fontSize: 12 }}>Net LP APY</span>
                <span className="font-mono" style={{ fontSize: 12, color: 'var(--success)' }}>{netApy}%</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-text-tertiary" style={{ fontSize: 12 }}>USDC received</span>
              <UsdcAmount raw={usdcOut} className="font-mono text-text-primary" style={{ fontSize: 12 }} />
            </div>
          )}
        </div>
      )}

      {!wallet ? (
        <button
          disabled
          className="w-full py-2.5 rounded-lg font-medium text-white opacity-40"
          style={{ background: 'var(--brand)', fontSize: 14 }}
        >
          Connect wallet to {tab}
        </button>
      ) : (
        <button
          disabled={!inputVal}
          onClick={tab === 'deposit' ? handleDeposit : handleWithdraw}
          className="w-full py-2.5 rounded-lg font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-90"
          style={{ background: tab === 'deposit' ? 'var(--brand)' : 'var(--warning)', fontSize: 14 }}
        >
          {tab === 'deposit' ? 'Deposit USDC' : 'Withdraw USDC'}
        </button>
      )}
    </div>
  );
}
