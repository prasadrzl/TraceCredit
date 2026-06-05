'use client';

import type { LiqActivity } from '@/types/liquidation';
import { ExternalLink } from 'lucide-react';

interface Props { activities: LiqActivity[] }

export function LiqActivityFeed({ activities }: Props) {
  const nextScan = activities[0]?.nextScanSecs ?? 232;
  const m = Math.floor(nextScan / 60);
  const s = nextScan % 60;

  return (
    <div className="card-base">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12 }}>↗</span>
          <span className="font-medium text-text-primary" style={{ fontSize: 13 }}>24h activity</span>
        </div>
        <span className="text-text-tertiary" style={{ fontSize: 11 }}>
          {activities.length} event{activities.length !== 1 ? 's' : ''} today · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <div className="space-y-3">
        {activities.map((a, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="h-2 w-2 rounded-full mt-1.5 shrink-0 bg-[var(--success)]" />
            <div className="flex-1 min-w-0">
              <p className="text-text-tertiary" style={{ fontSize: 11 }}>{a.timeUtc} · {a.minsAgo} minutes ago</p>
              <p className="font-medium text-text-primary mt-0.5" style={{ fontSize: 13 }}>
                Loan liquidated #{a.loanNum}
              </p>
              <p className="text-text-secondary" style={{ fontSize: 12 }}>borrower {a.borrowerShort}</p>
              <p className="text-text-tertiary mt-0.5" style={{ fontSize: 11 }}>{a.note}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-semibold" style={{ fontSize: 12, color: 'var(--success)' }}>{a.recovered}</p>
              <p className="text-text-tertiary" style={{ fontSize: 11 }}>{a.writtenOff}</p>
              <button className="flex items-center gap-1 text-text-tertiary hover:text-text-secondary mt-0.5 ml-auto" style={{ fontSize: 11 }}>
                {a.txHash} <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        <div className="pt-2" style={{ borderTop: '0.5px solid var(--border)' }}>
          <p className="text-text-tertiary italic" style={{ fontSize: 11 }}>
            No further events in the last 24 hours. Next scheduled scan in {m}m {s.toString().padStart(2,'0')}s.
          </p>
        </div>
      </div>
    </div>
  );
}
