'use client';

import type { LoanDetail } from '@/types/loan-detail';

const STEPS = [
  { key: 'Requested',   icon: '✓' },
  { key: 'Active',      icon: '⚡' },
  { key: 'Grace period',icon: '🔒' },
  { key: 'Defaulted',   icon: '🔒' },
  { key: 'Repaid',      icon: '🔒' },
];

interface Props { loan: LoanDetail }

export function LifecycleTimeline({ loan }: Props) {
  const activeIdx = loan.state === 'Active' ? 1
    : loan.state === 'GracePeriod' ? 2
    : loan.state === 'Defaulted' ? 3
    : loan.state === 'Repaid' ? 4 : 1;

  const labels: Record<number, string> = {
    0: loan.requestedAt,
    1: loan.activeAt,
  };

  return (
    <div>
      <p className="text-text-tertiary font-medium mb-3" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lifecycle</p>
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const isDone    = i < activeIdx;
          const isCurrent = i === activeIdx;
          const isLocked  = i > activeIdx;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: isDone ? 'var(--success)' : isCurrent ? 'var(--brand)' : 'var(--bg-surface)',
                    border: isLocked ? '0.5px solid var(--border)' : 'none',
                    color: isLocked ? 'var(--text-tertiary)' : '#fff',
                  }}
                >
                  {isLocked ? '🔒' : isDone ? '✓' : step.icon}
                </div>
                <p className="font-medium" style={{ fontSize: 11, color: isCurrent ? 'var(--text-primary)' : isLocked ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                  {step.key}
                </p>
                <p className="text-text-tertiary" style={{ fontSize: 10 }}>{labels[i] ?? '—'}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mb-6" style={{ background: i < activeIdx ? 'var(--success)' : 'var(--border)' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
