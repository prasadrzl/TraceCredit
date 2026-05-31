/**
 * Contract addresses on Optimism Sepolia.
 * Replace with values from your deployment once contracts are live.
 */
export const CONTRACT_ADDRESSES = {
  reputationSbt: process.env.NEXT_PUBLIC_REPUTATION_SBT_ADDRESS as `0x${string}`,
  scoreEngine: process.env.NEXT_PUBLIC_SCORE_ENGINE_ADDRESS as `0x${string}`,
  lendingPool: process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS as `0x${string}`,
  creditLineManager: process.env.NEXT_PUBLIC_CREDIT_LINE_MANAGER_ADDRESS as `0x${string}`,
  rateLimiter: process.env.NEXT_PUBLIC_RATE_LIMITER_ADDRESS as `0x${string}`,
  liquidationManager: process.env.NEXT_PUBLIC_LIQUIDATION_MANAGER_ADDRESS as `0x${string}`,
  feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS as `0x${string}`,
  reserveModule: process.env.NEXT_PUBLIC_RESERVE_MODULE_ADDRESS as `0x${string}`,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
} as const;
