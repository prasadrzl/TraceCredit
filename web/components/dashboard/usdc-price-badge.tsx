'use client';

import { useUsdcPrice } from '@/hooks/use-price';
import { Skeleton } from '@/components/ui/skeleton';

export function UsdcPriceBadge() {
  const { data, isLoading } = useUsdcPrice();

  if (isLoading) {
    return <Skeleton className="h-10 w-full rounded-lg" />;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
      <div>
        <p className="text-[11px] text-muted-foreground leading-none">USDC / USD · Current price</p>
        <p className="text-base font-semibold mt-1">${data?.priceUsd.toFixed(4) ?? '—'}</p>
      </div>
      <span className="text-[11px] text-muted-foreground">via Chainlink</span>
    </div>
  );
}
