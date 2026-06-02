import { cn } from '@/lib/utils/cn';
import { shortenAddress } from '@/lib/utils/format';

interface AddressChipProps {
  address: string;
  chars?: number;
  className?: string;
}

export function AddressChip({ address, chars = 4, className }: AddressChipProps) {
  return (
    <span
      className={cn('font-mono text-xs text-muted-foreground', className)}
      title={address}
    >
      {shortenAddress(address, chars)}
    </span>
  );
}
