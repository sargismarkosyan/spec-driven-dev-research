'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_CATEGORY_IDS, CATEGORY_DISPLAY_NAMES } from '@/lib/domain/constants';
import { setFacilitatorToken } from '@/lib/client/storage';

const WINDOW_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: 'Untimed', value: 0 },
];

export default function CreateSessionPage() {
  const router = useRouter();
  const [name, setName] = useState('Platform team · Q2 audit');
  const [windowMin, setWindowMin] = useState(10);
  const [liveFeed, setLiveFeed] = useState(true);
  const [categories, setCategories] = useState<string[]>([...ALL_CATEGORY_IDS]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleCategory = (id: string) => {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          facilitatorName: '',
          submissionWindowMin: windowMin,
          liveTeamFeed: liveFeed,
          enabledCategories: categories,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create session');
      setFacilitatorToken(data.id, data.token);
      router.push(`/session/${data.id}/lobby?token=${data.token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
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
          <a href="/" className="wa-brand" style={{ textDecoration: 'none', marginBottom: 48, display: 'flex' }}>
            <span className="wa-brandmark">W</span>
            <span>Work Audit</span>
          </a>
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

          {error && (
            <div style={{
              background: 'var(--rust-bg)', border: '1px solid #e8c8b8', borderRadius: 4,
              padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#6a2810',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 22 }}>
            <label className="wa-label">Session name</label>
            <input
              className="wa-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Platform team · Q2 audit"
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label className="wa-label">
              Submission window{' '}
              <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--muted-2)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>
                · soft, extendable
              </span>
            </label>
            <div className="wa-seg">
              {WINDOW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={windowMin === opt.value ? 'is-on' : ''}
                  onClick={() => setWindowMin(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.55 }}>
              A hint, not a lock. Engineers see a countdown but submissions don&apos;t close —
              you can extend mid-session, or end early.
            </p>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="wa-label" style={{ margin: 0 }}>Prompt categories shown to engineers</label>
              <div className="wa-seg" style={{ fontSize: 10 }}>
                <button
                  type="button"
                  className={categories.length === ALL_CATEGORY_IDS.length ? 'is-on' : ''}
                  onClick={() => setCategories([...ALL_CATEGORY_IDS])}
                  style={{ fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.04em', padding: '3px 9px' }}
                >
                  all on
                </button>
                <button
                  type="button"
                  className={categories.length === 0 ? 'is-on' : ''}
                  onClick={() => setCategories([])}
                  style={{ fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.04em', padding: '3px 9px' }}
                >
                  all off
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {ALL_CATEGORY_IDS.map((id) => {
                const on = categories.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`wa-chip ${on ? 'is-sage' : ''}`}
                    style={{ borderStyle: on ? 'solid' : 'dashed', cursor: 'pointer', background: on ? 'var(--sage-bg)' : 'transparent', color: on ? '#3b4a2b' : 'var(--muted)' }}
                    onClick={() => toggleCategory(id)}
                  >
                    {on ? '✓ ' : ''}
                    {CATEGORY_DISPLAY_NAMES[id as keyof typeof CATEGORY_DISPLAY_NAMES]}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
              Each category shows example activities engineers can tap to pre-fill a card title. Disable categories that don&apos;t apply to this team.
            </p>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label className="wa-label">Live colleague feed</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                onClick={() => setLiveFeed((v) => !v)}
                style={{
                  width: 34, height: 20, borderRadius: 10,
                  background: liveFeed ? 'var(--ink)' : 'var(--rule)',
                  position: 'relative', flexShrink: 0, cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, ...(liveFeed ? { right: 3 } : { left: 3 }),
                  transition: 'left 0.15s, right 0.15s',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Engineers see each other&apos;s activities live</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Transparency, not surveillance. Helps recall.</div>
              </div>
            </div>
          </div>

          <button
            className="wa-btn"
            onClick={handleCreate}
            disabled={loading || !name.trim()}
          >
            {loading ? 'Creating…' : 'Create session →'}
          </button>

          <hr className="wa-rule" style={{ margin: '28px 0 16px' }} />
          <div className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: '0.04em' }}>
            ↳ Engineers join via link — no login, no account needed.
          </div>
        </div>
      </div>
    </div>
  );
}
