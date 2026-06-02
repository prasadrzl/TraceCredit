'use client';

import { OnboardingShell } from './onboarding-shell';

interface Props { onNext: () => void; onBack: () => void }

const FEATURES = [
  {
    icon: '🔒',
    title: 'Non-custodial SBT',
    sub: 'Your SBT lives in your wallet. We never hold or control it.',
  },
  {
    icon: '📈',
    title: 'Grows over time with you',
    sub: 'Repay loans on time, vote in DAOs, and add attestations to raise your score.',
  },
  {
    icon: '💳',
    title: 'Protocol credit',
    sub: 'Unlock up to $100k USDC credit line. Higher score = lower rate.',
  },
  {
    icon: '🛡️',
    title: 'Non-transferable & privacy-preserving',
    sub: 'Soulbound tokens cannot be sold or transferred. Your reputation, your control.',
  },
];

export function StepSbtIntro({ onNext, onBack }: Props) {
  return (
    <OnboardingShell step={1} totalSteps={3} title="Your on-chain identity" onBack={onBack}>
      <p className="text-text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
        At TraceCredit, your SBT (Soulbound Token) is a non-transferable on-chain credential
        that stores your reputation. It's permanently linked to your wallet — no one else
        can hold your SBT, and it never leaves your address.
      </p>

      <div className="space-y-3 mt-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="surface-base p-3.5 rounded-xl flex items-start gap-3">
            <span
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-base"
              style={{ background: 'var(--brand-subtle)' }}
            >
              {f.icon}
            </span>
            <div>
              <p className="font-medium text-text-primary" style={{ fontSize: 13 }}>{f.title}</p>
              <p className="text-text-secondary mt-0.5" style={{ fontSize: 12, lineHeight: 1.5 }}>{f.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
        style={{ background: 'var(--brand)', fontSize: 14 }}
      >
        Continue →
      </button>
    </OnboardingShell>
  );
}
