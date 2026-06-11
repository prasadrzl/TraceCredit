export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),

  database: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/tracecredit',
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  chain: {
    rpcUrl: process.env.RPC_URL ?? 'https://sepolia.optimism.io',
    chainId: parseInt(process.env.CHAIN_ID ?? '11155420', 10),
  },

  contracts: {
    lendingPool: process.env.LENDING_POOL_ADDRESS!,
    reputationSbt: process.env.REPUTATION_SBT_ADDRESS!,
    scoreEngine: process.env.SCORE_ENGINE_ADDRESS!,
    creditLineManager: process.env.CREDIT_LINE_MANAGER_ADDRESS!,
    liquidationManager: process.env.LIQUIDATION_MANAGER_ADDRESS!,
    attestationBridge: process.env.ATTESTATION_BRIDGE_ADDRESS!,
    whitelistRegistry: process.env.WHITELIST_REGISTRY_ADDRESS!,
    reserveModule: process.env.RESERVE_MODULE_ADDRESS!,
    feeCollector: process.env.FEE_COLLECTOR_ADDRESS!,
    sbtStakeVault: process.env.SBT_STAKE_VAULT_ADDRESS!,
    rateLimiter: process.env.RATE_LIMITER_ADDRESS!,
    interestAccrualEngine: process.env.INTEREST_ACCRUAL_ENGINE_ADDRESS!,
    usdc: process.env.USDC_ADDRESS!,
    chainlinkUsdcUsd: process.env.CHAINLINK_USDC_USD_FEED!,
  },

  subgraphUrl: process.env.SUBGRAPH_URL ?? '',

  /** Comma-separated allowed CORS origins for production, e.g. "https://app.tracecredit.io" */
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  liquidationBot: {
    privateKey: process.env.LIQUIDATION_BOT_PRIVATE_KEY ?? '',
  },
});
