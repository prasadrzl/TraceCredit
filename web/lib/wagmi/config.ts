import { createConfig, http } from 'wagmi';
import { optimismSepolia, mainnet } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from '@wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

export const wagmiConfig = createConfig({
  chains: [optimismSepolia, mainnet],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
    coinbaseWallet({ appName: 'TraceCredit' }),
  ],
  transports: {
    [optimismSepolia.id]: http(),
    [mainnet.id]: http(),
  },
});
