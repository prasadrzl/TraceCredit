'use client';

import { WagmiProvider as BaseWagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi/config';

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return <BaseWagmiProvider config={wagmiConfig}>{children}</BaseWagmiProvider>;
}
