'use client';

import { useConnect } from 'wagmi';
import { Button } from '@/components/ui/button';

interface ConnectPromptProps {
  message?: string;
}

export function ConnectPrompt({ message = 'Connect your wallet to continue.' }: ConnectPromptProps) {
  const { connect, connectors } = useConnect();

  return (
    <div className="container flex flex-col items-center justify-center py-32 gap-4 text-center">
      <p className="text-muted-foreground max-w-sm">{message}</p>
      <div className="flex gap-2">
        {connectors.map((connector) => (
          <Button key={connector.uid} onClick={() => connect({ connector })}>
            Connect with {connector.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
