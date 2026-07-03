import { optimismSepolia, optimism, base, baseSepolia, arbitrum, arbitrumSepolia } from 'viem/chains';

const TX_EXPLORERS: Record<number, string> = {
  [optimismSepolia.id]: 'https://sepolia-optimism.etherscan.io/tx',
  [optimism.id]:        'https://optimistic.etherscan.io/tx',
  [base.id]:            'https://basescan.org/tx',
  [baseSepolia.id]:     'https://sepolia.basescan.org/tx',
  [arbitrum.id]:        'https://arbiscan.io/tx',
  [arbitrumSepolia.id]: 'https://sepolia.arbiscan.io/tx',
};

export function getTxUrl(chainId: number, txHash: string): string {
  const base = TX_EXPLORERS[chainId] ?? TX_EXPLORERS[optimismSepolia.id];
  return `${base}/${txHash}`;
}

export function getAddressUrl(chainId: number, address: string): string {
  return getTxUrl(chainId, '').replace('/tx/', `/address/${address}`);
}
