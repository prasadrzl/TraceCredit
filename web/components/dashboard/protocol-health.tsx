'use client';

import { useEffect, useState } from 'react';
import { useProtocolHealth } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_CONFIG = {
  operational: { dot: 'bg-[var(--success)]',  label: 'Operational', text: 'text-[var(--success)]'  },
  degraded:    { dot: 'bg-[var(--warning)]',   label: 'Degraded',    text: 'text-[var(--warning)]'  },
  down:        { dot: 'bg-[var(--danger)]',    label: 'Down',        text: 'text-[var(--danger)]'   },
} as const;

export function ProtocolHealth() {
  const { data, isLoading } = useProtocolHealth();
  const [age, setAge] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setAge(a => a + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card-base space-y-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text-primary">Protocol Health</span>
        <span style={{ fontSize: 11 }} className="text-text-tertiary">
          Updated {age}s ago
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-36 bg-bg-surface" />
              <Skeleton className="h-3 w-20 bg-bg-surface" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {(data ?? []).map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            return (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-text-secondary" style={{ fontSize: 13 }}>{item.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
