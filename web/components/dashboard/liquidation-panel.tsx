'use client';

import { useLiquidationStats, useRecentLiquidations } from '@/hooks/use-liquidations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddressChip } from '@/components/common/address-chip';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUsdcCompact, formatDate } from '@/lib/utils/format';

export function LiquidationPanel() {
  const { data: stats, isLoading: statsLoading } = useLiquidationStats();
  const { data: records, isLoading: recLoading } = useRecentLiquidations(3);
  const isLoading = statsLoading || recLoading;

  const recoveryRate =
    stats && Number(stats.totalRecovered) + Number(stats.totalWrittenOff) > 0
      ? Math.round(
          (Number(stats.totalRecovered) /
            (Number(stats.totalRecovered) + Number(stats.totalWrittenOff))) *
            100,
        )
      : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Liquidations (24h)</CardTitle>
          <span className="text-[11px] text-muted-foreground">
            {stats?.last24hCount ?? '—'} today
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            {/* Recent individual records */}
            <div className="space-y-3">
              {(records ?? []).slice(0, 3).map((r) => (
                <div key={r.loanId} className="flex items-start justify-between text-sm gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Loan #{r.loanId}</p>
                    <AddressChip address={r.borrower} />
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDate(new Date(r.liquidatedAt).getTime() / 1000)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-green-600 font-semibold text-sm">
                      {formatUsdcCompact(r.recoveredAmount)} recovered
                    </p>
                    <p className="text-red-500 text-[11px] line-through">
                      {formatUsdcCompact(r.writtenOffAmount)} written off
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals row */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              <TotalCell label="Total" value={String(stats?.totalLiquidations ?? 0)} />
              <TotalCell
                label="Recovered"
                value={formatUsdcCompact(stats?.totalRecovered ?? '0')}
                valueClass="font-bold"
              />
              <TotalCell
                label="Written off"
                value={formatUsdcCompact(stats?.totalWrittenOff ?? '0')}
                valueClass="font-bold text-red-600"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TotalCell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-md bg-muted/50 p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${valueClass ?? ''}`}>{value}</p>
    </div>
  );
}
