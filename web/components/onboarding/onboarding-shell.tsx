'use client';

import { ReactNode } from 'react';

interface Props {
  step: number;
  totalSteps: number;
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  children: ReactNode;
}

export function OnboardingShell({ step, totalSteps, title, onBack, showBack = true, children }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-sm space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          {showBack && onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-text-tertiary hover:text-text-secondary transition-colors"
              style={{ fontSize: 13 }}
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <span className="text-text-tertiary" style={{ fontSize: 12 }}>
            {step} of {totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(step / totalSteps) * 100}%`, background: 'var(--brand)' }}
          />
        </div>

        {/* Title */}
        <h2 className="font-bold text-text-primary" style={{ fontSize: 20 }}>{title}</h2>

        {/* Content */}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
