import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { optimismSepolia, optimism, base, arbitrum } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'TraceCredit',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
  // Primary testnet: Optimism Sepolia. Additional L2 mainnets for future support.
  chains: [optimismSepolia, optimism, base, arbitrum],
  ssr: true,
});
