'use client';

import { UsdcAmount } from '@/components/common/usdc-amount';
import { Skeleton } from '@/components/ui/skeleton';
import { useSbtInfo } from '@/hooks/use-reputation';

interface Props { wallet: string }

export function SbtCard({ wallet }: Props) {
  const { data, isLoading } = useSbtInfo(wallet);

  if (isLoading || !data) {
    return (
      <div className="card-base space-y-3">
        <Skeleton className="h-5 w-24 bg-bg-surface" />
        <Skeleton className="h-28 w-full bg-bg-surface" />
      </div>
    );
  }

  return (
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">SBT Identity</span>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            background: data.frozen ? 'var(--danger-subtle)' : 'var(--success-subtle)',
            color: data.frozen ? 'var(--danger)' : 'var(--success)',
          }}
        >
          {data.status}
        </span>
      </div>

      <div className="surface-base p-3 rounded-lg flex items-center gap-3">
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 font-bold"
          style={{ background: 'var(--brand)', color: '#fff', fontSize: 18 }}
        >
          #{data.tokenId}
        </div>
        <div>
          <p className="font-mono text-text-primary" style={{ fontSize: 13 }}>{data.wallet}</p>
          <p className="text-text-tertiary" style={{ fontSize: 11 }}>Minted {data.mintedDate}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stake locked</p>
          <UsdcAmount raw={data.stakeLocked} className="font-mono font-medium text-text-primary" style={{ fontSize: 14 } as React.CSSProperties} />
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>USDC</p>
        </div>
        <div className="surface-base p-2.5 rounded-lg">
          <p className="text-text-tertiary mb-0.5" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unlock delay</p>
          <p className="font-mono font-medium text-text-primary" style={{ fontSize: 14 }}>30 days</p>
          <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>non-transferable</p>
        </div>
      </div>
    </div>
  );
}
