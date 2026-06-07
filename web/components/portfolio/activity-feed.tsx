'use client';

import { UsdcAmount } from '@/components/common/usdc-amount';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentActivity } from '@/hooks/use-portfolio';
import type { ActivityType } from '@/types/portfolio';

interface Props { wallet: string }

const TYPE_ICON: Record<ActivityType, string> = {
  repay:   '↑',
  borrow:  '↓',
  score:   '◈',
  deposit: '+',
  penalty: '!',
  withdraw:'↑',
};

const TYPE_COLOR: Record<ActivityType, string> = {
  repay:   'var(--success)',
  borrow:  'var(--brand)',
  score:   'var(--tier-platinum)',
  deposit: 'var(--success)',
  penalty: 'var(--danger)',
  withdraw:'var(--text-secondary)',
};

export function ActivityFeed({ wallet }: Props) {
  const { data, isLoading } = useRecentActivity(wallet);

  return (
    <div className="card-base space-y-3">
      <span className="text-base font-medium text-text-primary">Recent Activity</span>

      {isLoading || !data ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-bg-surface" />)}
        </div>
      ) : (
        <div className="space-y-1">
          {data.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 font-mono font-bold"
                style={{ background: 'var(--bg-surface)', color: TYPE_COLOR[item.type], fontSize: 14 }}
              >
                {TYPE_ICON[item.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary truncate" style={{ fontSize: 13 }}>{item.label}</p>
                <p className="text-text-tertiary truncate" style={{ fontSize: 11 }}>{item.sub}</p>
              </div>
              <div className="shrink-0 text-right">
                {item.amount !== undefined ? (
                  <p
                    className="font-mono font-medium"
                    style={{ fontSize: 13, color: Number(item.amount) < 0 ? 'var(--danger)' : 'var(--success)' }}
                  >
                    {Number(item.amount) < 0 ? '−' : '+'}
                    <UsdcAmount raw={String(Math.abs(Number(item.amount)))} compact />
                  </p>
                ) : item.scoreChange !== undefined ? (
                  <p className="font-mono font-medium" style={{ fontSize: 13, color: (item.scoreChange ?? 0) > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {(item.scoreChange ?? 0) > 0 ? '+' : ''}{item.scoreChange} pts
                  </p>
                ) : null}
                <p className="text-text-tertiary" style={{ fontSize: 10 }}>{item.daysAgo}d ago</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
