'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-14 px-4 text-center min-h-[200px] w-full', className)}>
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width: 48, height: 48,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-soft)',
          color: 'var(--text-tertiary)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div className="space-y-1">
        <p className="font-medium text-text-primary" style={{ fontSize: 13 }}>{title}</p>
        {description && (
          <p className="text-text-tertiary max-w-xs mx-auto" style={{ fontSize: 12, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
