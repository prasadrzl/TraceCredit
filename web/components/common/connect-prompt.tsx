'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

interface ConnectPromptProps {
  message?: string;
}

export function ConnectPrompt({ message = 'Connect your wallet to continue.' }: ConnectPromptProps) {
  return (
    <div className="container flex flex-col items-center justify-center py-32 gap-4 text-center">
      <p className="text-muted-foreground max-w-sm">{message}</p>
      <ConnectButton />
    </div>
  );
}
