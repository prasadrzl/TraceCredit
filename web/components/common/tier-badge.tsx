import { cn } from '@/lib/utils/cn';
import { TIER_BG_CLASSES, type Tier } from '@/lib/utils/tiers';

interface TierBadgeProps {
  tier: Tier;
  className?: string;
  size?: 'sm' | 'md';
}

export function TierBadge({ tier, className, size = 'md' }: TierBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        TIER_BG_CLASSES[tier],
        className,
      )}
    >
      {tier}
    </span>
  );
}
