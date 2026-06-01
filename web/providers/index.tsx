'use client';

import { ThemeProvider } from './theme-provider';
import { WagmiProvider } from './wagmi-provider';
import { QueryProvider } from './query-provider';
import { SocketProvider } from './socket-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WagmiProvider>
        <QueryProvider>
          <SocketProvider>{children}</SocketProvider>
        </QueryProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
