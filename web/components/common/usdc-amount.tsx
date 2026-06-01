import React from 'react';
import { cn } from '@/lib/utils/cn';
import { formatUsdc, formatUsdcCompact } from '@/lib/utils/format';

interface UsdcAmountProps {
  raw: string;
  compact?: boolean;
  className?: string;
  decimals?: number;
  style?: React.CSSProperties;
}

export function UsdcAmount({ raw, compact = false, className, decimals = 2, style }: UsdcAmountProps) {
  return (
    <span className={cn('font-mono tabular-nums', className)} style={style}>
      {compact ? formatUsdcCompact(raw) : formatUsdc(raw, decimals)}
    </span>
  );
}
