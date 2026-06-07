'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useSignalDecay } from '@/hooks/use-reputation';

interface Props { wallet: string }

export function DecaySchedule({ wallet }: Props) {
  const { data, isLoading } = useSignalDecay(wallet);

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Signal Decay Schedule</span>
        <span className="text-text-tertiary" style={{ fontSize: 12 }}>Active windows</span>
      </div>

      {isLoading || !data ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-bg-surface" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 12 }}>
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-text-tertiary font-normal pb-2" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signal</th>
                <th className="text-left text-text-tertiary font-normal pb-2" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Applied</th>
                <th className="text-left text-text-tertiary font-normal pb-2" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expires</th>
                <th className="text-left text-text-tertiary font-normal pb-2" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duration</th>
                <th className="text-right text-text-tertiary font-normal pb-2" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      {item.expiring && (
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--warning)' }} />
                      )}
                      <span className="text-text-primary">{item.signal}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-text-secondary">{item.applied.slice(5)}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className="font-mono"
                      style={{ color: item.expiring ? 'var(--warning)' : 'var(--text-secondary)' }}
                    >
                      {item.expires.slice(5)}
                    </span>
                    {item.expiring && (
                      <span className="ml-1 text-xs font-medium" style={{ color: 'var(--warning)' }}>expiring</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-text-secondary">{item.duration}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className="font-mono font-medium"
                      style={{ color: item.points > 0 ? 'var(--success)' : 'var(--danger)' }}
                    >
                      {item.points > 0 ? '+' : ''}{item.points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
