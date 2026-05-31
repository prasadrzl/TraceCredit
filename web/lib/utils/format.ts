/** Convert 6-decimal USDC bigint string to human-readable dollar string */
export function formatUsdc(raw: string, decimals = 2): string {
  const value = Number(raw) / 1_000_000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Format a USDC string as a compact value: "$5.0M", "$2.4k" */
export function formatUsdcCompact(raw: string): string {
  const value = Number(raw) / 1_000_000;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(2)}`;
}

/** Convert basis points to percentage string: 1400 → "14.0%" */
export function bpsToPercent(bps: number | string, decimals = 2): string {
  return `${(Number(bps) / 100).toFixed(decimals)}%`;
}

/** Shorten an Ethereum address: "0x1234...5678" */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Format unix timestamp to relative time: "2m ago", "just now" */
export function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 30) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Format unix timestamp to a readable date */
export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(ts * 1000));
}
