'use client';

import Link from 'next/link';

interface Props { onGetStarted: () => void }

const HOW_STEPS = [
  { icon: '🗂️', title: 'Connect wallet',   sub: 'Link your existing EVM wallet' },
  { icon: '🪙',  title: 'Mint your SBT',    sub: 'Lock 50 USDC · get on-chain identity' },
  { icon: '⭐', title: 'Build reputation', sub: 'Repay loans · vote · hold assets' },
  { icon: '↗️',  title: 'Borrow USDC',      sub: 'Up to $100k at 7% APR' },
];

const STATS = [
  { label: 'Total value locked', value: '$50M',  color: '#fff' },
  { label: 'LP net APY',         value: '4.76%', color: '#7C6DDB' },
  { label: 'Active borrowers',   value: '89',    color: '#fff' },
  { label: 'Diamond APR',        value: '7%',    color: '#EF9F27' },
];

export function StepLanding({ onGetStarted }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0E0E12', color: '#fff' }}>
      {/* Top nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ background: 'var(--brand)', fontSize: 13 }}
          >
            T
          </span>
          <span className="font-semibold text-white" style={{ fontSize: 15 }}>TraceCredit</span>
        </div>
        <nav className="hidden sm:flex items-center gap-6" style={{ fontSize: 13, color: '#aaa' }}>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <Link href="/markets" className="hover:text-white transition-colors">Markets</Link>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
        </nav>
        <button
          onClick={onGetStarted}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
          style={{ background: 'var(--brand)', fontSize: 13 }}
        >
          Launch app <span>→</span>
        </button>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 max-w-3xl mx-auto w-full">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-10"
          style={{ background: 'rgba(124,109,219,0.12)', border: '0.5px solid rgba(124,109,219,0.4)' }}
        >
          <span style={{ fontSize: 13 }}>🛡️</span>
          <span style={{ fontSize: 12, color: '#A89FE8', fontWeight: 500 }}>
            Trustless undercollateralised lending on Base
          </span>
        </div>

        <h1 className="font-bold leading-tight mb-6" style={{ fontSize: 'clamp(42px, 7vw, 72px)', letterSpacing: '-0.02em' }}>
          Borrow without<br />
          <span style={{ color: 'var(--brand)' }}>locking collateral</span>
        </h1>

        <p className="mb-10" style={{ fontSize: 16, maxWidth: 520, lineHeight: 1.7, color: '#999' }}>
          Your on-chain history is your credit score. Repay loans, vote in DAOs, hold
          assets — and unlock a revolving credit line proportional to your reputation.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', fontSize: 14, color: '#fff' }}
          >
            <span style={{ fontSize: 14 }}>🔗</span>
            Connect wallet to start
          </button>
          <Link
            href="/markets"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', fontSize: 14, color: '#ccc' }}
          >
            View live markets
          </Link>
        </div>

        <div className="flex items-center gap-2" style={{ fontSize: 12, color: '#666' }}>
          <span>🔒</span>
          <span>No KYC · No collateral · Non-custodial</span>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-4 pb-12 max-w-5xl mx-auto w-full">
        <p className="text-center font-medium mb-6" style={{ fontSize: 11, letterSpacing: '0.12em', color: '#555', textTransform: 'uppercase' }}>
          HOW IT WORKS
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {HOW_STEPS.map((step) => (
            <div
              key={step.title}
              className="flex flex-col gap-3 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}
            >
              <span
                className="h-9 w-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(124,109,219,0.15)', border: '0.5px solid rgba(124,109,219,0.25)' }}
              >
                {step.icon}
              </span>
              <div>
                <p className="font-semibold text-white mb-1" style={{ fontSize: 13 }}>{step.title}</p>
                <p style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>{step.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 pb-16 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-1 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}
            >
              <p className="font-mono font-bold" style={{ fontSize: 28, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 12, color: '#666' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
