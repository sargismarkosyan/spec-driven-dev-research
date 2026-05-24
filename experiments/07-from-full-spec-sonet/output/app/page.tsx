'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toggle } from '@/app/components/Primitives';
import { PROMPT_CATEGORIES, DEFAULT_ENABLED_CATEGORIES } from '@/lib/categories';

const WINDOW_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: 'Untimed', value: 0 },
];

export default function CreateSession() {
  const router = useRouter();
  const [sessionName, setSessionName] = useState('Platform team · Q2 audit');
  const [windowMin, setWindowMin] = useState(10);
  const [enabledCategories, setEnabledCategories] = useState<string[]>(DEFAULT_ENABLED_CATEGORIES);
  const [liveTeamFeed, setLiveTeamFeed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    if (enabledCategories.includes(id) && enabledCategories.length === 1) return;
    setEnabledCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const canCreate = sessionName.trim().length > 0 && enabledCategories.length > 0 && !loading;

  const handleCreate = async () => {
    if (!canCreate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName.trim(),
          facilitatorName: '',
          submissionWindowMin: windowMin,
          liveTeamFeed,
          enabledCategories,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create session');
        return;
      }
      localStorage.setItem(`wa-facilitator-token-${data.id}`, data.facilitatorToken);
      router.push(`/session/${data.id}/lobby?token=${data.facilitatorToken}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100dvh' }}>
      {/* Left column — form */}
      <div style={{
        padding: '60px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        maxWidth: 560,
        width: '100%',
      }}>
        <div>
          <div className="wa-eyebrow" style={{ marginBottom: 10 }}>New session</div>
          <h1 className="wa-display" style={{ margin: 0 }}>Start a work audit</h1>
        </div>

        {error && (
          <div style={{
            background: 'var(--rust-bg)',
            border: '1px solid #e8c8b8',
            borderRadius: 6,
            padding: '12px 14px',
            color: '#6a2810',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 18, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Session name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="wa-label">Session name</label>
          <input
            className="wa-input"
            type="text"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
          />
        </div>

        {/* Submission window */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="wa-label">Submission window</label>
          <div style={{ display: 'flex', border: '1px solid var(--border-soft)', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
            {WINDOW_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWindowMin(opt.value)}
                style={{
                  flex: 1,
                  padding: '9px 4px',
                  fontSize: 12,
                  background: windowMin === opt.value ? 'var(--ink)' : '#fff',
                  color: windowMin === opt.value ? 'var(--cream)' : 'var(--muted-2)',
                  border: 'none',
                  borderRight: i < WINDOW_OPTIONS.length - 1 ? '1px solid var(--border-soft)' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontWeight: windowMin === opt.value ? 500 : 400,
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.55 }}>
            A hint, not a lock. Engineers see countdown but submissions don&apos;t close — you can extend mid-session, or end early. Late joiners can still drop in after the round starts.
          </p>
        </div>

        {/* Prompt categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label className="wa-label">Prompt categories</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="wa-btn is-ghost"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={() => setEnabledCategories(DEFAULT_ENABLED_CATEGORIES)}
            >
              All on
            </button>
            <button
              type="button"
              className="wa-btn is-ghost"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={() => setEnabledCategories([])}
            >
              All off
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PROMPT_CATEGORIES.map(cat => {
              const enabled = enabledCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    padding: '5px 10px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: enabled ? '1px solid #c8d2b1' : '1px dashed var(--border)',
                    background: enabled ? 'var(--sage-bg)' : 'transparent',
                    color: enabled ? '#3b4a2b' : 'var(--muted)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.12s',
                  }}
                >
                  {enabled ? `✓ ${cat.label}` : cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live team feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Toggle
            on={liveTeamFeed}
            onChange={setLiveTeamFeed}
            label="Engineers see each other's activities live"
          />
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            Transparency, not surveillance. Helps recall.
          </p>
        </div>

        {/* Create button + footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <button
            className="wa-btn"
            disabled={!canCreate}
            onClick={handleCreate}
            style={{ width: '100%', justifyContent: 'center', fontSize: 14 }}
          >
            {loading ? 'Creating…' : 'Create session →'}
          </button>
          <hr className="wa-rule" style={{ margin: '16px 0 12px' }} />
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            ↳ Engineers join via link — no login, no account needed.
          </p>
        </div>
      </div>

      {/* Right column — How it works */}
      <div style={{
        background: 'var(--paper-deep)',
        padding: '60px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        borderLeft: '1px solid var(--border)',
      }}>
        <div className="wa-eyebrow">How it works</div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontSize: 24,
          letterSpacing: '-0.01em',
          margin: 0,
          lineHeight: 1.3,
        }}>
          A structured retro for recurring work
        </h2>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, lineHeight: 1.65 }}>
          Engineers submit activities, tag effort and energy, then the team classifies what to automate, investigate, or accept.
        </p>
      </div>
    </div>
  );
}
