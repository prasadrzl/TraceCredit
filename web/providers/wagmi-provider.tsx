'use client';

import { useState } from 'react';
import { WagmiProvider as BaseWagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { useTheme } from 'next-themes';
import { wagmiConfig } from '@/lib/wagmi/config';

function RainbowKitThemed({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <RainbowKitProvider theme={resolvedTheme === 'dark' ? darkTheme() : lightTheme()}>
      {children}
    </RainbowKitProvider>
  );
}

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 2 },
        },
      }),
  );

  return (
    <BaseWagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>
        <RainbowKitThemed>
          {children}
        </RainbowKitThemed>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BaseWagmiProvider>
  );
}
