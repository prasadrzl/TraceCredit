'use client';

import { UsdcAmount } from '@/components/common/usdc-amount';
import { TierBadge } from '@/components/common/tier-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveLoans } from '@/hooks/use-borrow';
import { useTxModal } from '@/store/tx-modal-store';
import { useWalletScore } from '@/hooks/use-wallet-score';
import { useProtocolConfig, PROTOCOL_CONFIG_DEFAULTS } from '@/hooks/use-config';
import type { LoanState } from '@/types/borrow';

interface Props { wallet: string }

const STATE_STYLE: Record<LoanState, { label: string; color: string }> = {
  Active:      { label: 'Active',       color: 'var(--success)'       },
  GracePeriod: { label: 'Grace period', color: 'var(--warning)'       },
  Repaid:      { label: 'Repaid',       color: 'var(--text-tertiary)' },
  Defaulted:   { label: 'Defaulted',    color: 'var(--danger)'        },
  WrittenOff:  { label: 'Written off',  color: 'var(--danger)'        },
};

export function ActiveLoansPanel({ wallet }: Props) {
  const { data, isLoading } = useActiveLoans(wallet);
  const { open, transitionTo } = useTxModal();
  const { data: scoreData } = useWalletScore(wallet);
  const { data: cfg } = useProtocolConfig();

  const currentScore = scoreData?.score ?? 0;
  const scoreGain = cfg?.onTimeRepaymentScoreGain ?? PROTOCOL_CONFIG_DEFAULTS.onTimeRepaymentScoreGain;
  const scorePenalty = cfg?.gracePeriodScoreHit ?? PROTOCOL_CONFIG_DEFAULTS.gracePeriodScoreHit;

  const handleRepay = (loanId: string, totalDue: string, isGrace: boolean) => {
    const newScore = isGrace ? Math.max(0, currentScore - scorePenalty) : currentScore + scoreGain;
    open({
      type:          'repay-confirm',
      loanId,
      amount:        totalDue,
      isGrace,
      scoreGain:     isGrace ? 0 : scoreGain,
      currentScore,
      newScore,
      creditRestored: totalDue,
      onConfirm: () => {
        transitionTo({ type: 'tx-pending', description: `Repaying Loan #${loanId}`, step: 'signing' });
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Repaying Loan #${loanId}`, step: 'submitted',  txHash: '0xdef456abc789' }), 1200);
        setTimeout(() => transitionTo({ type: 'tx-pending', description: `Repaying Loan #${loanId}`, step: 'confirming', txHash: '0xdef456abc789' }), 2800);
        setTimeout(() => transitionTo({
          type:        'tx-success',
          description: `Loan #${loanId} repaid · Credit restored`,
          txHash:      '0xdef456abc789',
          scoreChange: isGrace ? -scorePenalty : scoreGain,
          newScore,
          ctaLabel:    'View Reputation',
          ctaHref:     '/reputation',
        }), 4400);
      },
    });
  };

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Active Loans</span>
        {data && (
          <span className="text-text-tertiary" style={{ fontSize: 12 }}>{data.length} open</span>
        )}
      </div>

      {isLoading || !data ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full bg-bg-surface" />)}
        </div>
      ) : data.length === 0 ? (
        <p className="text-text-tertiary py-4 text-center" style={{ fontSize: 13 }}>No active loans</p>
      ) : (
        <div className="space-y-3">
          {data.map((loan) => {
            const ss = STATE_STYLE[loan.state];
            const isGrace = loan.state === 'GracePeriod';
            return (
              <div
                key={loan.loanId}
                className="surface-base p-3 rounded-lg space-y-2.5"
                style={isGrace ? { border: '0.5px solid var(--warning)', background: 'var(--warning-subtle)' } : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-text-primary" style={{ fontSize: 13 }}>
                      Loan #{loan.loanId}
                    </span>
                    {loan.tier && <TierBadge tier={loan.tier} size="sm" />}
                  </div>
                  <span className="font-medium" style={{ fontSize: 12, color: ss.color }}>{ss.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <p className="text-text-tertiary" style={{ fontSize: 10 }}>Principal</p>
                    <UsdcAmount raw={loan.principal} className="text-text-primary font-medium" style={{ fontSize: 13 }} />
                  </div>
                  <div>
                    <p className="text-text-tertiary" style={{ fontSize: 10 }}>Total due</p>
                    <UsdcAmount raw={loan.totalDue} className="text-text-primary font-medium" style={{ fontSize: 13 }} />
                  </div>
                  <div>
                    <p className="text-text-tertiary" style={{ fontSize: 10 }}>APR</p>
                    <p className="font-mono text-text-primary" style={{ fontSize: 13 }}>{(loan.aprBps / 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary" style={{ fontSize: 10 }}>
                      {isGrace ? 'Grace expires' : 'Deadline'}
                    </p>
                    <p className="font-mono" style={{ fontSize: 13, color: isGrace ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {isGrace ? `${loan.daysLeft}d left` : loan.deadline}
                    </p>
                  </div>
                </div>

                {isGrace && loan.scoreHitOnDefault && (
                  <p style={{ fontSize: 11, color: 'var(--warning)' }}>
                    Default risk: {loan.scoreHitOnDefault} pts · {loan.freezeMonthsOnDefault}-month freeze
                  </p>
                )}

                <button
                  onClick={() => handleRepay(loan.loanId, loan.totalDue, isGrace)}
                  className="w-full py-1.5 rounded-md font-medium transition-opacity hover:opacity-80"
                  style={{
                    fontSize: 12,
                    background: isGrace ? 'var(--warning)' : 'var(--bg-surface)',
                    color: isGrace ? '#fff' : 'var(--text-primary)',
                    border: isGrace ? 'none' : '0.5px solid var(--border)',
                  }}
                >
                  Repay <UsdcAmount raw={loan.totalDue} compact />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
