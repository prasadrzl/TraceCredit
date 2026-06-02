'use client';

import { useRouter } from 'next/navigation';
import { ScoreGauge } from '@/components/common/score-gauge';
import { OnboardingShell } from './onboarding-shell';

const NEXT_ACTIONS = [
  { icon: '💸', title: 'Take your first loan',         sub: 'Borrow USDC against your reputation',   href: '/borrow' },
  { icon: '🏦', title: 'Deposit & earn APY',           sub: 'Provide liquidity and earn 4.76%',       href: '/lend' },
  { icon: '🔗', title: 'Connect attestation sources',  sub: 'Add EAS, Gitcoin Passport, ENS signals', href: '/reputation' },
  { icon: '🗳️', title: 'Take your first DAO vote',     sub: 'Earn +2 pts per governance participation', href: '#' },
];

interface Props { onDone: () => void }

export function StepSbtSuccess({ onDone }: Props) {
  const router = useRouter();

  const handleAction = (href: string) => {
    onDone();
    router.push(href);
  };

  return (
    <OnboardingShell step={3} totalSteps={3} title="Your SBT is live" showBack={false}>
      {/* Success banner */}
      <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'var(--success-subtle)', border: '0.5px solid var(--success)' }}>
        <span style={{ fontSize: 16 }}>🎉</span>
        <p className="font-medium" style={{ fontSize: 13, color: 'var(--success)' }}>
          SBT minted successfully · Block confirmed
        </p>
      </div>

      {/* Score */}
      <div className="flex flex-col items-center gap-2 py-2">
        <ScoreGauge score={0} size={140} />
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: '#D85A3020', color: '#D85A30' }}
          >
            Bronze
          </span>
          <span className="text-text-tertiary" style={{ fontSize: 12 }}>Starting score · grows with activity</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Score',         value: '0' },
          { label: 'Credit limit',  value: '$0' },
          { label: 'SBT stake',     value: '$50' },
        ].map((s) => (
          <div key={s.label} className="surface-base p-2.5 rounded-xl text-center">
            <p className="font-mono font-bold text-text-primary" style={{ fontSize: 18 }}>{s.value}</p>
            <p className="text-text-tertiary mt-0.5" style={{ fontSize: 10 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Next actions */}
      <div className="space-y-2">
        <p className="text-text-tertiary font-medium" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Build your score — what to do next
        </p>
        {NEXT_ACTIONS.map((a) => (
          <button
            key={a.title}
            onClick={() => handleAction(a.href)}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left hover:bg-bg-surface transition-colors"
            style={{ border: '0.5px solid var(--border)', background: 'var(--bg-card)' }}
          >
            <span className="text-lg shrink-0">{a.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary" style={{ fontSize: 13 }}>{a.title}</p>
              <p className="text-text-tertiary truncate" style={{ fontSize: 11 }}>{a.sub}</p>
            </div>
            <span className="text-text-tertiary shrink-0" style={{ fontSize: 16 }}>›</span>
          </button>
        ))}
      </div>

      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
        style={{ background: 'var(--brand)', fontSize: 14 }}
      >
        Go to dashboard →
      </button>
    </OnboardingShell>
  );
}
