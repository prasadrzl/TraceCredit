'use client';

import type { SignalBreakdownItem } from '@/types/score-history';

interface Props { items: SignalBreakdownItem[] }

export function SignalBreakdown({ items }: Props) {
  return (
    <div className="card-base">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12 }}>⊙</span>
          <span className="font-medium text-text-primary" style={{ fontSize: 13 }}>Signal breakdown</span>
        </div>
        <span className="text-text-tertiary" style={{ fontSize: 11 }}>last 30d · pts</span>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                {item.isNegative
                  ? <span style={{ fontSize: 11 }}>⚠</span>
                  : <span style={{ fontSize: 11 }}>✓</span>}
                <span className="text-text-secondary" style={{ fontSize: 12 }}>{item.label}</span>
              </div>
              <span className="font-mono font-semibold" style={{ fontSize: 12, color: item.isNegative ? 'var(--danger)' : 'var(--success)' }}>
                {item.points > 0 ? '+' : ''}{item.points}
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* How scoring works */}
      <div className="mt-4 pt-3 space-y-2" style={{ borderTop: '0.5px solid var(--border)' }}>
        <p className="font-medium text-text-primary" style={{ fontSize: 12 }}>How scoring works</p>
        {[
          { icon: '✓', color: 'var(--success)', text: 'Repayments are log-scaled — earlier repayments earn more than the 100th.' },
          { icon: '↗', color: '#3b82f6', text: 'Cross-protocol signals require an EAS attestation from a whitelisted attester.' },
          { icon: '⚠', color: 'var(--warning)', text: 'Penalties weigh more than gains. A single default can erase months of repayment.' },
          { icon: '⊙', color: 'var(--text-tertiary)', text: 'Decay applies to wallets that go inactive 14+ days.' },
        ].map(r => (
          <div key={r.text} className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5" style={{ fontSize: 11, color: r.color }}>{ r.icon}</span>
            <p className="text-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
