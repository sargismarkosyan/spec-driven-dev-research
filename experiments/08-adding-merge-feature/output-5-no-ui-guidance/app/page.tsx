'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROMPT_CATEGORIES, ALL_CATEGORY_IDS } from '@/lib/categories';

const WINDOWS = [5, 10, 15, 20, 0] as const; // 0 = untimed
const WINDOW_LABELS: Record<number, string> = {
  5: '5 min', 10: '10 min', 15: '15 min', 20: '20 min', 0: 'Untimed',
};

export default function CreateSession() {
  const router = useRouter();
  const [sessionName, setSessionName]  = useState('Platform team · Q2 audit');
  const [windowMin, setWindowMin]      = useState<number>(10);
  const [liveFeed, setLiveFeed]        = useState(true);
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(
    new Set(ALL_CATEGORY_IDS) // all on by default
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const toggleCategory = (id: string) => {
    setEnabledCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!sessionName.trim()) {
      setError('Session name is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName.trim(),
          facilitatorName: '',
          submissionWindowMin: windowMin,
          liveTeamFeed: liveFeed,
          enabledCategories: [...enabledCategories],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create session');
      localStorage.setItem(`wa-token-${data.id}`, data.token);
      router.push(`/session/${data.id}/lobby?token=${data.token}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100dvh' }}>

      {/* LEFT — editorial intro */}
      <div style={{
        padding: '64px 72px 64px',
        background: 'var(--paper)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid var(--rule)',
      }}>
        <div>
          <div className="wa-brand" style={{ marginBottom: 48, textDecoration: 'none' }}>
            <span className="wa-brandmark">W</span>
            <span>Work Audit</span>
          </div>
          <span className="wa-eyebrow">The work audit · quarterly</span>
          <h1 className="wa-display" style={{
            fontSize: 44, lineHeight: 1.05, margin: '14px 0 20px', letterSpacing: '-0.02em',
          }}>
            What work are we doing,<br />
            and should we still be<br />
            doing it that way?
          </h1>
          <p style={{ color: 'var(--muted)', maxWidth: 400, marginBottom: 36, fontSize: 15, lineHeight: 1.55 }}>
            Set up a session, share the link in your meeting,
            and spend ten minutes auditing the recurring work your team actually does.
          </p>
          <div className="wa-mono" style={{
            fontSize: 11, color: 'var(--muted-2)', letterSpacing: '0.06em', textTransform: 'uppercase',
            display: 'flex', gap: 20, flexWrap: 'wrap',
          }}>
            <span>↳ Energy × effort matrix</span>
            <span>↳ Spot what to eliminate or automate</span>
            <span>↳ Export results to Markdown</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 24 }}>
          <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', letterSpacing: '0.06em' }}>
            WORK AUDIT · v0.3 · energy × effort matrix · team-classified automatability
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div style={{ padding: '48px 64px', background: 'var(--cream)', overflowY: 'auto' }}>
        <div style={{ maxWidth: 460 }}>
          <h2 className="wa-display" style={{ fontSize: 28, margin: '0 0 28px', fontWeight: 500 }}>
            Set up the session
          </h2>

          {error ? (
            <div style={{
              background: 'var(--rust-bg)', border: '1px solid #e8c8b8', borderRadius: 4,
              padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#6a2810',
            }}>
              {error}
            </div>
          ) : null}

          {/* Session name */}
          <div style={{ marginBottom: 22 }}>
            <label className="wa-label">Session name</label>
            <input
              className="wa-input"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="Platform team · Q2 audit"
            />
          </div>

          {/* Submission window */}
          <div style={{ marginBottom: 22 }}>
            <label className="wa-label">
              Submission window <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--muted-2)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>· soft, extendable</span>
            </label>
            <div className="wa-seg">
              {WINDOWS.map(w => (
                <button
                  key={w}
                  className={windowMin === w ? 'is-on' : ''}
                  onClick={() => setWindowMin(w)}
                >
                  {WINDOW_LABELS[w]}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.55 }}>
              A hint, not a lock. Engineers see a countdown but submissions don&apos;t close —
              you can <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>+2 / +5 / extend</span> mid-session, or end early.
            </p>
          </div>

          {/* Prompt categories */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="wa-label" style={{ margin: 0 }}>Prompt categories shown to engineers</label>
              <div className="wa-seg" style={{ fontSize: 10 }}>
                <button
                  className={enabledCategories.size === ALL_CATEGORY_IDS.length ? 'is-on' : ''}
                  onClick={() => setEnabledCategories(new Set(ALL_CATEGORY_IDS))}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', padding: '3px 9px' }}
                >all on</button>
                <button
                  className={enabledCategories.size === 0 ? 'is-on' : ''}
                  onClick={() => setEnabledCategories(new Set())}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', padding: '3px 9px' }}
                >all off</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {PROMPT_CATEGORIES.map(cat => {
                const on = enabledCategories.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`wa-chip ${on ? 'is-sage' : ''}`}
                    style={{ borderStyle: on ? 'solid' : 'dashed', cursor: 'pointer', background: on ? 'var(--sage-bg)' : 'transparent', color: on ? '#3b4a2b' : 'var(--muted)' }}
                  >
                    {on ? '✓ ' : ''}{cat.label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
              Each category shows example activities engineers can tap to pre-fill a card title. Disable categories that don&apos;t apply to this team.
            </p>
          </div>

          {/* Live colleague feed */}
          <div style={{ marginBottom: 32 }}>
            <label className="wa-label">Live colleague feed</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                onClick={() => setLiveFeed(v => !v)}
                style={{
                  width: 34, height: 20, borderRadius: 10,
                  background: liveFeed ? 'var(--ink)' : 'var(--rule)',
                  position: 'relative', flexShrink: 0, cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, [liveFeed ? 'right' : 'left']: 3,
                  transition: 'left 0.15s, right 0.15s',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Engineers see each other&apos;s activities live</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Transparency, not surveillance. Helps recall.</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="wa-btn"
              onClick={handleCreate}
              disabled={loading || !sessionName.trim()}
            >
              {loading ? 'Creating…' : 'Create session →'}
            </button>
          </div>

          <hr className="wa-rule" style={{ margin: '28px 0 16px' }} />
          <div className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: '0.04em' }}>
            ↳ Engineers join via link — no login, no account needed.
          </div>
        </div>
      </div>
    </div>
  );
}
