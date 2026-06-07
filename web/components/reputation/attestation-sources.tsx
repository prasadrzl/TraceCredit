'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useAttestationSources } from '@/hooks/use-reputation';
import type { AttestationStatus } from '@/types/reputation';

interface Props { wallet: string }

const STATUS_STYLE: Record<AttestationStatus, { label: string; color: string }> = {
  Active:       { label: 'Active',          color: 'var(--success)'        },
  ExpiringSoon: { label: 'Expiring soon',   color: 'var(--warning)'        },
  NotAttested:  { label: 'Not attested',    color: 'var(--text-tertiary)'  },
};

export function AttestationSources({ wallet }: Props) {
  const { data, isLoading } = useAttestationSources(wallet);

  return (
    <div className="card-base space-y-3">
      <span className="text-base font-medium text-text-primary">Attestation Sources</span>

      {isLoading || !data ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full bg-bg-surface" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((src) => {
            const ss = STATUS_STYLE[src.status];
            return (
              <div key={src.id} className="surface-base p-3 rounded-lg flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-text-primary font-medium" style={{ fontSize: 13 }}>{src.name}</p>
                  <p className="text-text-tertiary truncate" style={{ fontSize: 11 }}>{src.sub}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="font-medium" style={{ fontSize: 12, color: ss.color }}>{ss.label}</span>
                  {src.dots !== undefined && (
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className="h-2 w-2 rounded-full"
                          style={{ background: i < (src.dots ?? 0) ? 'var(--brand)' : 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
