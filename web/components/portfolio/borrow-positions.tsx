'use client';

import { UsdcAmount } from '@/components/common/usdc-amount';
import { TierBadge } from '@/components/common/tier-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBorrowPositions } from '@/hooks/use-portfolio';
import { useTxModal } from '@/store/tx-modal-store';

interface Props { wallet: string }

export function BorrowPositions({ wallet }: Props) {
  const { data, isLoading } = useBorrowPositions(wallet);
  const { open, transitionTo } = useTxModal();

  const handleRepay = (loanId: string, amount: string, isGrace: boolean) => {
    open({
      type:          'repay-confirm',
      loanId,
      amount,
      isGrace,
      scoreGain:     isGrace ? 0 : 22,
      currentScore:  628,
      newScore:      isGrace ? 578 : 650,
      creditRestored: amount,
      onConfirm: () => {
        transitionTo({ type: 'tx-pending', description: `Repaying Loan #${loanId}`, step: 'signing' });
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Repaying Loan #${loanId}`, step: 'submitted',  txHash: '0xdef456abc789' }), 1200);
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Repaying Loan #${loanId}`, step: 'confirming', txHash: '0xdef456abc789' }), 2800);
        setTimeout(() => transitionTo({
          type:        'tx-success',
          description: `Loan #${loanId} repaid · Credit restored`,
          txHash:      '0xdef456abc789',
          scoreChange: isGrace ? -50 : 22,
          newScore:    isGrace ? 578 : 650,
          ctaLabel:    'View Reputation',
          ctaHref:     '/reputation',
        }), 4400);
      },
    });
  };

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Borrow Positions</span>
        {data && (
          <span className="text-text-tertiary" style={{ fontSize: 12 }}>
            {data.openCount} open · {data.historicalCount} repaid
          </span>
        )}
      </div>

      {isLoading || !data ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-bg-surface" />)}
        </div>
      ) : (
        <>
          {data.alert && (
            <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--warning-subtle)', border: '0.5px solid var(--warning)' }}>
              <p className="font-medium" style={{ fontSize: 12, color: 'var(--warning)' }}>Grace period warning</p>
              <p className="text-text-secondary" style={{ fontSize: 12 }}>{data.alert.message}</p>
              <button
                onClick={() => handleRepay(data.alert!.loanId, data.alert!.repayAmount, true)}
                className="mt-1 px-3 py-1.5 rounded-md font-medium text-white hover:opacity-90 transition-opacity"
                style={{ fontSize: 12, background: 'var(--warning)' }}
              >
                Repay <UsdcAmount raw={data.alert.repayAmount} compact />
              </button>
            </div>
          )}

          <div className="space-y-2">
            {data.active.map((loan) => {
              const isGrace = loan.state === 'GracePeriod';
              const repayAmount = String(
                Math.round((Number(loan.principal) + Number(loan.interest)))
              );
              return (
                <div key={loan.loanId} className="surface-base p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-text-primary" style={{ fontSize: 13 }}>Loan #{loan.loanId}</span>
                      <TierBadge tier={loan.tier} size="sm" />
                    </div>
                    <span className="font-medium" style={{ fontSize: 12, color: isGrace ? 'var(--warning)' : 'var(--success)' }}>
                      {isGrace ? 'Grace period' : 'Active'} · {loan.daysLeft}d left
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <UsdcAmount raw={loan.principal} className="font-mono text-text-primary" style={{ fontSize: 13 }} />
                    <span className="text-text-tertiary" style={{ fontSize: 11 }}>{loan.note}</span>
                  </div>
                  <button
                    onClick={() => handleRepay(loan.loanId, repayAmount, isGrace)}
                    className="w-full py-1.5 rounded-md font-medium transition-opacity hover:opacity-80"
                    style={{
                      fontSize: 12,
                      background: isGrace ? 'var(--warning)' : 'var(--bg-surface)',
                      color: isGrace ? '#fff' : 'var(--text-primary)',
                      border: isGrace ? 'none' : '0.5px solid var(--border)',
                    }}
                  >
                    Repay <UsdcAmount raw={repayAmount} compact />
                  </button>
                </div>
              );
            })}
          </div>

          {data.historical.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-text-tertiary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>History</p>
              {data.historical.map((loan) => (
                <div key={loan.loanId} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-text-secondary" style={{ fontSize: 12 }}>#{loan.loanId}</span>
                    <span className="text-text-tertiary" style={{ fontSize: 11 }}>{loan.dateRange}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <UsdcAmount raw={loan.principal} compact className="text-text-secondary" style={{ fontSize: 12 }} />
                    <span className="text-text-tertiary" style={{ fontSize: 11 }}>{loan.note}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
