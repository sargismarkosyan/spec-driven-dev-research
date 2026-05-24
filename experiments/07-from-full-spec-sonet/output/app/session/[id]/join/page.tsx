'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Session, Participant } from '@/app/components/Primitives';

const ROLES = ['IC', 'EM', 'PM', 'UX', 'Other'] as const;
type Role = (typeof ROLES)[number];

type ParticipantEx = Participant & { isFacilitator?: boolean };

export default function JoinScreen() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('IC');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Smart redirect: already joined → go straight to board
    const stored = localStorage.getItem(`wa-eng-name-${id}`);
    if (stored) {
      router.replace(`/session/${id}/board`);
      return;
    }

    fetch(`/api/sessions/${id}`)
      .then(async res => {
        if (res.status === 404) {
          setLoadError('Session not found.');
          return;
        }
        const data = await res.json();
        if (data.error) {
          setLoadError(data.error);
          return;
        }
        setSession(data as Session);
        nameRef.current?.focus();
      })
      .catch(() => {
        setLoadError('Could not load session.');
      });
  }, [id, router]);

  const trimmedName = name.trim();
  const canJoin = trimmedName.length > 0 && !joining;

  const engineers: ParticipantEx[] = session
    ? (session.participants as ParticipantEx[]).filter(p => !p.isFacilitator)
    : [];

  const isDuplicate =
    trimmedName.length > 0 &&
    engineers.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());

  const engineerCount = engineers.length;

  const handleJoin = () => {
    if (!canJoin) return;
    setJoining(true);
    localStorage.setItem(`wa-eng-name-${id}`, trimmedName);
    localStorage.setItem(`wa-eng-role-${id}`, role);
    router.push(`/session/${id}/board`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin();
  };

  const sessionName = session?.name ?? 'Loading session…';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100dvh' }}>
      {/* Left column — editorial */}
      <div style={{
        padding: '60px 48px',
        background: 'var(--paper-deep)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        borderRight: '1px solid var(--border)',
      }}>
        <a href="/" className="wa-brand">
          <span className="wa-brandmark">W</span>
          <span>Work Audit</span>
        </a>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 32 }}>
          <div className="wa-eyebrow">You&apos;ve been invited</div>
          <h1
            className="wa-display"
            style={{ margin: 0, fontSize: '2.1rem', lineHeight: 1.15 }}
          >
            {sessionName}
          </h1>

          {session && (
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, lineHeight: 1.65 }}>
              You&apos;ll list the recurring work you actually do and tag each item with three
              quick questions. Takes about ten minutes.
            </p>
          )}

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'No account, no email — just your name',
              'Your answers stay in this session',
              'You can see what your teammates submit',
            ].map((text, i) => (
              <li
                key={i}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--ink-2)' }}
              >
                <span style={{ color: 'var(--rust)', fontFamily: 'var(--font-mono)', flexShrink: 0, marginTop: 1 }}>
                  →
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="wa-eyebrow" style={{ marginTop: 'auto' }}>
          ↳ SESSION ID · {id}
        </div>
      </div>

      {/* Right column — form */}
      <div style={{
        padding: '60px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        justifyContent: 'center',
      }}>
        {loadError ? (
          <div style={{
            background: 'var(--rust-bg)',
            border: '1px solid #e8c8b8',
            borderRadius: 6,
            padding: '16px 20px',
            color: '#6a2810',
            fontSize: 14,
          }}>
            {loadError}
          </div>
        ) : (
          <>
            <div>
              <div className="wa-eyebrow" style={{ marginBottom: 8 }}>Join the session</div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: '1.65rem',
                margin: 0,
                letterSpacing: '-0.01em',
              }}>
                What should we call you?
              </h2>
            </div>

            {/* Name input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 380 }}>
              <label className="wa-label">Your name</label>
              <input
                ref={nameRef}
                className={`wa-input${isDuplicate ? ' wa-input--error' : ''}`}
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              {isDuplicate && (
                <div style={{
                  background: 'var(--amber-bg)',
                  border: '1px solid #e8d2a8',
                  borderRadius: 4,
                  padding: '8px 10px',
                  fontSize: 12,
                  color: '#6f4318',
                  lineHeight: 1.55,
                }}>
                  Someone is already using this name in the session. If that&apos;s you, continue —
                  we&apos;ll reconnect you to your existing cards.
                </div>
              )}
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                ↳ shown to teammates, not stored after session ends
              </p>
            </div>

            {/* Role selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 380 }}>
              <label className="wa-label">Role (optional)</label>
              <div style={{
                display: 'flex',
                border: '1px solid var(--border-soft)',
                borderRadius: 4,
                overflow: 'hidden',
                background: '#fff',
              }}>
                {ROLES.map((r, i) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      flex: 1,
                      padding: '9px 4px',
                      fontSize: 12,
                      background: role === r ? 'var(--ink)' : '#fff',
                      color: role === r ? 'var(--cream)' : 'var(--muted-2)',
                      border: 'none',
                      borderRight: i < ROLES.length - 1 ? '1px solid var(--border-soft)' : 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      fontWeight: role === r ? 500 : 400,
                      transition: 'background 0.12s, color 0.12s',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                ↳ used for filtering · IC is fine for most engineers
              </p>
            </div>

            {/* Join button + status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
              <button
                className="wa-btn"
                disabled={!canJoin}
                onClick={handleJoin}
                style={{ width: '100%', justifyContent: 'center', fontSize: 14 }}
              >
                {joining ? 'Joining…' : `Join ${session?.name ?? 'session'} →`}
              </button>

              {session && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {engineerCount === 0
                    ? 'Be the first to join!'
                    : engineerCount === 1
                    ? '1 person is already inside.'
                    : `${engineerCount} people are already inside.`}
                  {session.status === 'lobby' && ' Submissions open when the facilitator hits start.'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
