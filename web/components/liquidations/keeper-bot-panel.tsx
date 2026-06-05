'use client';

import { useEffect, useState } from 'react';
import type { KeeperBot } from '@/types/liquidation';
import { Zap } from 'lucide-react';

function countdown(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

interface Props { bot: KeeperBot }

export function KeeperBotPanel({ bot }: Props) {
  const [remaining, setRemaining] = useState(bot.nextScanSecs);

  useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card-base">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-text-tertiary" />
          <span className="font-medium text-text-primary" style={{ fontSize: 13 }}>Keeper bot</span>
        </div>
        <span className="text-text-tertiary font-mono" style={{ fontSize: 10, letterSpacing: '0.04em' }}>LIQUIDATION_BOT_ROLE</span>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--success-subtle)', border: '0.5px solid var(--success)' }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
          <div>
            <p className="font-medium" style={{ fontSize: 12, color: 'var(--success)' }}>Online · scanning</p>
            <p className="text-text-tertiary" style={{ fontSize: 10 }}>last active {bot.lastActiveMinsAgo}m ago</p>
          </div>
        </div>
        <span className="font-mono font-semibold" style={{ fontSize: 12, color: 'var(--success)' }}>next in {countdown(remaining)}</span>
      </div>

      <div className="space-y-2">
        {[
          { icon: '⊙', label: 'Address',          value: bot.address },
          { icon: '⊞', label: 'Batch size',        value: `${bot.batchSize} loans / scan` },
          { icon: '⏱', label: 'Scan interval',     value: `${bot.scanIntervalMins} min` },
          { icon: '↗', label: 'Tx success rate',   value: `${bot.txSuccessRatePct}%` },
          { icon: '⛽', label: 'Gas spent · 30d',  value: `${bot.gasSpent30dEth} ETH` },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-text-tertiary">
              <span style={{ fontSize: 11 }}>{row.icon}</span>
              <span style={{ fontSize: 12 }}>{row.label}</span>
            </div>
            <span className="font-mono text-text-primary" style={{ fontSize: 12 }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
