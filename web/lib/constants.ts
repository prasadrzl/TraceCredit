export const QUERY_KEYS = {
  score: (wallet: string) => ['score', wallet] as const,
  scoreHistory: (wallet: string, limit: number) => ['score', wallet, 'history', limit] as const,
  creditLine: (wallet: string) => ['credit', wallet, 'line'] as const,
  rateLimit: (wallet: string, tier: number) => ['credit', wallet, 'rate-limit', tier] as const,
  positions: (wallet: string) => ['positions', wallet] as const,
  loan: (loanId: string) => ['positions', 'loan', loanId] as const,
  vaultStats: () => ['vault', 'stats'] as const,
  sharesValue: (wallet: string) => ['vault', 'shares', wallet] as const,
  apyStats: () => ['yield', 'apy'] as const,
  pendingYield: (wallet: string) => ['yield', 'pending', wallet] as const,
  poolOverview: () => ['pool', 'overview'] as const,
  recentBorrows: (first: number) => ['pool', 'borrows', first] as const,
  recentLiquidations: (first: number) => ['pool', 'liquidations', first] as const,
  protocolStats: () => ['analytics', 'protocol'] as const,
  volume: (days: number) => ['analytics', 'volume', days] as const,
  liquidations: (limit: number) => ['liquidation', 'list', limit] as const,
  liquidationStats: () => ['liquidation', 'stats'] as const,
  liquidationsByBorrower: (wallet: string) => ['liquidation', wallet] as const,
  usdcPrice: () => ['price', 'usdc'] as const,
  priceHistory: (limit: number) => ['price', 'usdc', 'history', limit] as const,
  attestationConfig: () => ['attestation', 'config'] as const,
  attestationHistory: (wallet: string) => ['attestation', wallet, 'history'] as const,
  compliance: (wallet: string, country: string) => ['anchor', wallet, country] as const,
} as const;

export const REFETCH_INTERVALS = {
  price:        15_000,   // USDC price — changes fast
  pool:         30_000,   // pool/vault stats
  score:        60_000,   // reputation score — changes slowly
  analytics:    60_000,   // protocol-wide analytics
  liquidations: 60_000,   // liquidation records
  health:       10_000,   // protocol health check — needs to be near real-time
  loanDetail:   15_000,   // active loan interest accrual
  history:      30_000,   // historical loan records
  attestation:  300_000,  // attestation config — rarely changes (5 min)
} as const;
