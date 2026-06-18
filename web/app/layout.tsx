import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import '@/styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from '@/providers';
import { Toaster } from '@/components/ui/toaster';
import { TxModalProvider } from '@/components/modals/tx-modal-provider';

export const metadata: Metadata = {
  title: { default: 'TraceCredit', template: '%s | TraceCredit' },
  description: 'Reputation-Weighted On-Chain Lending Protocol',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <TxModalProvider />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
