import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { optimismSepolia, mainnet } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'TraceCredit',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
  chains: [optimismSepolia, mainnet],
  ssr: true,
});
