'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  onClose?: () => void;
  closeable?: boolean;
  width?: number;
  children: React.ReactNode;
}

export function ModalShell({ onClose, closeable = true, width = 440, children }: ModalShellProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeable) onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeable, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={closeable ? onClose : undefined}
      />

      {/* Panel */}
      <div
        className="relative w-full"
        style={{
          maxWidth: width,
          background: 'var(--bg-card)',
          border: '0.5px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.24)',
          animation: 'modal-in 0.18s ease-out',
        }}
      >
        {closeable && onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 transition-colors hover:bg-[var(--bg-surface)]"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}
        {children}
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}

// ── Reusable sub-pieces ───────────────────────────────────────────────────────

export function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className="p-5 space-y-4">{children}</div>;
}

export function ModalRow({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary" style={{ fontSize: 13 }}>{label}</span>
      <span className="font-mono font-medium" style={{ fontSize: 13, color: valueColor ?? 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

export function ModalDivider() {
  return <div style={{ height: '0.5px', background: 'var(--border)' }} />;
}

export function ModalCta({
  label, onClick, variant = 'primary', disabled = false,
}: {
  label: string; onClick: () => void; variant?: 'primary' | 'danger' | 'warning' | 'ghost'; disabled?: boolean;
}) {
  const bg: Record<string, string> = {
    primary: 'var(--brand)',
    danger:  'var(--danger)',
    warning: 'var(--warning)',
    ghost:   'transparent',
  };
  const color: Record<string, string> = {
    primary: '#fff',
    danger:  '#fff',
    warning: '#fff',
    ghost:   'var(--text-secondary)',
  };
  const border: Record<string, string> = {
    primary: 'none',
    danger:  'none',
    warning: 'none',
    ghost:   '0.5px solid var(--border)',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl font-semibold transition-opacity disabled:opacity-40 hover:opacity-90"
      style={{ background: bg[variant], color: color[variant], border: border[variant], fontSize: 14 }}
    >
      {label}
    </button>
  );
}
