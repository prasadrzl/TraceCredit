'use client';

import { useState } from 'react';
import type { ScoreEvent, ScoreSignalType } from '@/types/score-history';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

const PAGE_SIZE = 8;

type FilterKey = 'All' | 'Repayment' | 'DAO' | 'Cross-protocol' | 'Penalty' | 'Decay';

const SIGNAL_ICON: Record<string, string> = {
  ON_TIME_REPAYMENT:        '✓',
  PARTIAL_REPAYMENT:        '⊙',
  LATE_REPAYMENT:           '⚠',
  DAO_VOTE:                 '⊞',
  CROSS_PROTOCOL_REPAYMENT: '↗',
  ATTESTATION_RECEIVED:     '⊙',
  WALLET_AGE:               '⊙',
  KYC_VERIFIED:             '⊙',
  DECAY:                    '⊙',
};

const SIGNAL_COLOR: Record<string, string> = {
  ON_TIME_REPAYMENT:        'var(--success)',
  PARTIAL_REPAYMENT:        '#818cf8',
  LATE_REPAYMENT:           'var(--danger)',
  DAO_VOTE:                 '#6366f1',
  CROSS_PROTOCOL_REPAYMENT: '#3b82f6',
  ATTESTATION_RECEIVED:     '#a855f7',
  WALLET_AGE:               'var(--text-tertiary)',
  KYC_VERIFIED:             '#a855f7',
  DECAY:                    'var(--text-tertiary)',
};

const SOURCE_TYPE_FILTER: Record<string, FilterKey> = {
  Repayment:       'Repayment',
  Governance:      'DAO',
  'Cross-protocol': 'Cross-protocol',
  Penalty:         'Penalty',
  Passive:         'Decay',
  Identity:        'Repayment',
};

interface Props { events: ScoreEvent[] }

export function EventTable({ events }: Props) {
  const [filter, setFilter] = useState<FilterKey>('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const counts: Record<FilterKey, number> = {
    All:            events.length,
    Repayment:      events.filter(e => e.sourceType === 'Repayment' || e.sourceType === 'Identity').length,
    DAO:            events.filter(e => e.sourceType === 'Governance').length,
    'Cross-protocol': events.filter(e => e.sourceType === 'Cross-protocol').length,
    Penalty:        events.filter(e => e.sourceType === 'Penalty').length,
    Decay:          events.filter(e => e.sourceType === 'Passive').length,
  };

  const filtered = filter === 'All' ? events : events.filter(e => SOURCE_TYPE_FILTER[e.sourceType] === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="card-base p-0 overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
        {(Object.keys(counts) as FilterKey[]).map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors"
            style={{ fontSize: 11, fontWeight: filter === f ? 600 : 400, background: filter === f ? 'var(--brand)' : 'transparent', color: filter === f ? '#fff' : 'var(--text-secondary)', border: filter === f ? 'none' : '0.5px solid var(--border)' }}>
            {f} <span className="opacity-70">{counts[f]}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button className="px-2.5 py-1 rounded-md text-text-secondary" style={{ fontSize: 11, border: '0.5px solid var(--border)' }}>Last 30 days</button>
          <button className="px-2.5 py-1 rounded-md text-text-secondary" style={{ fontSize: 11, border: '0.5px solid var(--border)' }}>Custom…</button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
            {['DATE · BLOCK', 'SIGNAL TYPE', 'SOURCE', 'DELTA', 'SCORE AFTER', 'TX HASH'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-text-tertiary font-medium" style={{ fontSize: 10, letterSpacing: '0.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center">
                <EmptyState
                  icon={<Sparkles size={22} />}
                  title="No score events yet"
                  description="Repayments, governance votes, and cross-protocol attestations will appear here."
                />
              </td>
            </tr>
          )}
          {paged.map(event => (
            <>
              <tr
                key={event.id}
                className="hover:bg-bg-surface transition-colors cursor-pointer"
                style={{ borderBottom: expanded === event.id || !event.attestation ? '0.5px solid var(--border)' : 'none' }}
                onClick={() => event.attestation && setExpanded(expanded === event.id ? null : event.id)}
              >
                <td className="px-4 py-3">
                  <p className="text-text-primary" style={{ fontSize: 12 }}>{event.date}</p>
                  <p className="font-mono text-text-tertiary" style={{ fontSize: 10 }}>{event.block}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {event.attestation && (
                      expanded === event.id
                        ? <ChevronDown className="h-3 w-3 text-text-tertiary" />
                        : <ChevronRight className="h-3 w-3 text-text-tertiary" />
                    )}
                    <span style={{ fontSize: 12, color: SIGNAL_COLOR[event.signalType] ?? 'var(--text-primary)' }}>
                      {SIGNAL_ICON[event.signalType] ?? '·'}
                    </span>
                    <div>
                      <p className="font-mono font-medium text-text-primary" style={{ fontSize: 11 }}>{event.signalLabel}</p>
                      <p className="text-text-tertiary" style={{ fontSize: 10 }}>{event.signalSub}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-text-primary" style={{ fontSize: 12 }}>{event.source}</p>
                  <p className="text-text-tertiary" style={{ fontSize: 10 }}>{event.sourceType}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono font-bold" style={{ fontSize: 14, color: event.delta > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {event.delta > 0 ? '+' : ''}{event.delta}
                  </span>
                  <span className="text-text-tertiary ml-1" style={{ fontSize: 10 }}>pts</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold text-text-primary" style={{ fontSize: 13 }}>{event.scoreAfter}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-text-tertiary" style={{ fontSize: 11 }}>{event.txHash}</span>
                </td>
              </tr>

              {/* Attestation expansion */}
              {event.attestation && expanded === event.id && (
                <tr key={`${event.id}-attest`} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <td colSpan={6} className="px-4 pb-3">
                    <div className="flex gap-4 p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
                      <div className="flex-1 space-y-1.5">
                        <p className="font-medium text-text-tertiary font-mono" style={{ fontSize: 10, letterSpacing: '0.06em' }}>EAS ATTESTATION</p>
                        {[
                          ['Schema',         event.attestation.schema],
                          ['UID',            event.attestation.uid],
                          ['Attester',       event.attestation.attester],
                          ['Recipient',      event.attestation.recipient],
                          ['Evidence hash',  event.attestation.evidenceHash],
                          ['Revocable',      event.attestation.revocable ? 'true' : 'false'],
                        ].map(([label, value]) => (
                          <div key={label as string} className="flex items-start gap-2">
                            <span className="text-text-tertiary w-28 shrink-0" style={{ fontSize: 11 }}>{label as string}</span>
                            <span className="font-mono text-text-secondary" style={{ fontSize: 11 }}>{value as string}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-text-tertiary" style={{ fontSize: 11 }}>Attestor quorum</span>
                          <div className="flex gap-0.5 ml-2">
                            {Array.from({ length: event.attestation.maxQuorum }).map((_, i) => (
                              <span key={i} className="h-2 w-2 rounded-full" style={{ background: i < event.attestation!.quorum ? 'var(--success)' : 'var(--border)' }} />
                            ))}
                          </div>
                          <span className="font-mono text-text-tertiary" style={{ fontSize: 10 }}>{event.attestation.quorum}/{event.attestation.maxQuorum} confirmed</span>
                        </div>
                      </div>
                      <div className="w-48 shrink-0">
                        <p className="font-medium text-text-tertiary font-mono mb-1" style={{ fontSize: 10, letterSpacing: '0.06em' }}>RAW PAYLOAD</p>
                        <pre className="text-text-secondary rounded-lg p-2 overflow-auto" style={{ fontSize: 10, lineHeight: 1.6, background: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
                          {JSON.stringify(event.attestation.rawPayload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '0.5px solid var(--border)' }}>
        <p className="text-text-tertiary" style={{ fontSize: 12 }}>
          Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} events
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-tertiary disabled:opacity-30"
            style={{ border: '0.5px solid var(--border)', fontSize: 14 }}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className="h-7 w-7 rounded-md flex items-center justify-center"
              style={{ fontSize: 12, background: p === page ? 'var(--brand)' : 'transparent', color: p === page ? '#fff' : 'var(--text-secondary)', border: p === page ? 'none' : '0.5px solid var(--border)' }}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-tertiary disabled:opacity-30"
            style={{ border: '0.5px solid var(--border)', fontSize: 14 }}>›</button>
        </div>
      </div>
    </div>
  );
}
