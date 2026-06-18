'use client';

import { ThemeProvider } from './theme-provider';
import { WagmiProvider } from './wagmi-provider';
import { SocketProvider } from './socket-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WagmiProvider>
        <SocketProvider>{children}</SocketProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
