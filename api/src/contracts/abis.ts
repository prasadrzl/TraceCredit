/** Minimal ABI fragments — only selectors consumed by this API. */

export const LENDING_POOL_ABI = [
  {
    name: 'getLoan',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'borrower', type: 'address' },
          { name: 'principal', type: 'uint256' },
          { name: 'rateBps', type: 'uint256' },
          { name: 'startTime', type: 'uint256' },
          { name: 'dueTime', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalOutstanding',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getUtilisationBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalDeposited',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'reserveFactor',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint16' }],
  },
  {
    name: 'borrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ name: 'loanId', type: 'uint256' }],
  },
  {
    name: 'repay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'loanId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export const REPUTATION_SBT_ABI = [
  {
    name: 'getScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint16' }],
  },
  {
    name: 'hasSBT',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isFrozen',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isBlacklisted',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const SCORE_ENGINE_ABI = [
  {
    name: 'getCreditTier',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'getCreditLimit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getInterestRateBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getLimitLockup',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lastActivity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const CREDIT_LINE_MANAGER_ABI = [
  {
    name: 'getCreditLine',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'limit', type: 'uint256' },
          { name: 'used', type: 'uint256' },
          { name: 'lastUpdated', type: 'uint40' },
          { name: 'frozen', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'available',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'creditLines',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [
      { name: 'limit', type: 'uint256' },
      { name: 'used', type: 'uint256' },
      { name: 'lastUpdated', type: 'uint40' },
      { name: 'frozen', type: 'bool' },
    ],
  },
] as const;

export const LIQUIDATION_MANAGER_ABI = [
  {
    name: 'liquidate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'batchLiquidate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'loanIds', type: 'uint256[]' }],
    outputs: [],
  },
  {
    name: 'GRACE_PERIOD',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const ATTESTATION_BRIDGE_ABI = [
  {
    name: 'requiredQuorum',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'QUORUM_WINDOW',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const WHITELIST_REGISTRY_ABI = [
  {
    name: 'isAllowed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'country', type: 'bytes2' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'blocked',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'geoBlocked',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'country', type: 'bytes2' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const RESERVE_MODULE_ABI = [
  {
    name: 'reserveBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'minimumReserveFloor',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const FEE_COLLECTOR_ABI = [
  {
    name: 'lpShareBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint16' }],
  },
  {
    name: 'daoShareBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint16' }],
  },
  {
    name: 'reserveShareBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint16' }],
  },
] as const;

export const RATE_LIMITER_ABI = [
  {
    name: 'remaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'tier', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'dailyLimit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'windows',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [
      { name: 'used', type: 'uint256' },
      { name: 'windowStart', type: 'uint40' },
    ],
  },
] as const;

export const INTEREST_ACCRUAL_ENGINE_ABI = [
  {
    name: 'calcRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'utilisationBps', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'calcAccrued',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'principal', type: 'uint256' },
      { name: 'rateBps', type: 'uint256' },
      { name: 'elapsed', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const ERC4626_ABI = [
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const CHAINLINK_AGGREGATOR_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
