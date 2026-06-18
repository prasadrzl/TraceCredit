'use client';

import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { useTheme } from 'next-themes';
import { ThemeProvider } from './theme-provider';
import { WagmiProvider } from './wagmi-provider';
import { QueryProvider } from './query-provider';
import { SocketProvider } from './socket-provider';

function RainbowProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <RainbowKitProvider theme={resolvedTheme === 'dark' ? darkTheme() : lightTheme()}>
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WagmiProvider>
        <QueryProvider>
          <RainbowProvider>
            <SocketProvider>{children}</SocketProvider>
          </RainbowProvider>
        </QueryProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
