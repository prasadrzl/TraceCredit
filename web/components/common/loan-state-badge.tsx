import { cn } from '@/lib/utils/cn';
import { LOAN_STATE_BG, type LoanState } from '@/lib/utils/loans';

interface LoanStateBadgeProps {
  state: LoanState;
  className?: string;
}

export function LoanStateBadge({ state, className }: LoanStateBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        LOAN_STATE_BG[state],
        className,
      )}
    >
      {state === 'GracePeriod' ? 'Grace period' : state}
    </span>
  );
}
