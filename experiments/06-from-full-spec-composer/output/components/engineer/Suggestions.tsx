'use client';

import type { Suggestion } from '@/lib/domain/suggestions';

export function Suggestions({
  suggestions,
  onSelect,
}: {
  suggestions: Suggestion[];
  onSelect: (title: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <p className="wa-eyebrow" style={{ margin: 0, color: 'var(--rust)' }}>
          ↳ Have you got these too?
        </p>
        <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
          {suggestions.length}
        </span>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 12, margin: '0 0 4px', lineHeight: 1.4 }}>
        Pulled from your team&apos;s submissions. Tap to draft a card —
      </p>
      <p
        style={{
          color: 'var(--muted)',
          fontSize: 12,
          fontStyle: 'italic',
          margin: '0 0 12px',
          lineHeight: 1.4,
        }}
      >
        you&apos;ll answer the 3 questions for your situation. Daily for Sarah might be weekly for
        you.
      </p>
      {suggestions.map((s) => (
        <button
          key={s.title}
          type="button"
          className="wa-suggestion-item"
          onClick={() => onSelect(s.title)}
        >
          <span style={{ color: 'var(--rust)', fontWeight: 600, marginRight: 4 }}>+</span>
          {s.title}
          <span className="wa-mono" style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            ↳ {s.firstName}
            {s.count > 1 ? ` · ${s.count} on the team` : ''}
          </span>
        </button>
      ))}
      <hr className="wa-rule" style={{ margin: '16px 0' }} />
    </>
  );
}
