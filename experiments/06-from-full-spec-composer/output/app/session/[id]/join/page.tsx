'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/domain/enums';
import { getEngName, getEngRole, setEngName, setEngRole } from '@/lib/client/storage';
import type { SerializedSession } from '@/lib/domain/types';

const ROLES: Role[] = ['IC', 'EM', 'PM', 'UX', 'Other'];

export default function JoinPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [session, setSession] = useState<SerializedSession | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('IC');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const savedName = getEngName(params.id);
    if (savedName) {
      router.replace(`/session/${params.id}/board`);
      return;
    }

    fetch(`/api/sessions/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError('Session not found.');
        else setSession(data);
      })
      .catch(() => setError('Could not load session.'));
  }, [params.id, router]);

  const handleJoin = () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setJoining(true);
    setEngName(params.id, name.trim());
    setEngRole(params.id, role);
    router.push(`/session/${params.id}/board`);
  };

  if (error && !session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--paper)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12, color: 'var(--muted)' }}>◌</div>
          <div style={{ color: 'var(--ink-2)', fontSize: 15 }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100dvh' }}>

      {/* LEFT — editorial context */}
      <div style={{
        padding: '64px',
        background: 'var(--paper)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        borderRight: '1px solid var(--rule)',
      }}>
        <div>
          <a href="/" className="wa-brand" style={{ textDecoration: 'none', marginBottom: 48, display: 'flex' }}>
            <span className="wa-brandmark">W</span>
            <span>Work Audit</span>
          </a>
          <span className="wa-eyebrow" style={{ marginTop: 48, display: 'block' }}>You&apos;ve been invited</span>
          <h1 className="wa-display" style={{
            fontSize: 40, lineHeight: 1.07, margin: '14px 0 20px', letterSpacing: '-0.02em',
          }}>
            {session ? session.name : 'Loading session…'}
          </h1>
          {session && (
            <>
              <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.55, maxWidth: 440, marginBottom: 24 }}>
                You&apos;ll list the recurring work you actually do and tag each item with three quick questions. Takes about ten minutes.
              </p>
              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {[
                  ['→', 'No account, no email — just your name'],
                  ['→', 'Your answers stay in this session'],
                  ['→', 'You can see what your teammates submit'],
                ].map(([a, b], i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                    <span className="wa-mono" style={{ color: 'var(--rust)', fontSize: 12 }}>{a}</span>
                    <span style={{ color: 'var(--ink-2)' }}>{b}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          ↳ SESSION ID · {params.id}
        </div>
      </div>

      {/* RIGHT — join form */}
      <div style={{
        padding: '64px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        background: 'var(--cream)',
      }}>
        <div style={{ maxWidth: 380 }}>
          <span className="wa-eyebrow">Join the session</span>
          <h2 className="wa-display" style={{ fontSize: 30, margin: '10px 0 32px', fontWeight: 500 }}>
            What should we call you?
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
            <label className="wa-label">Your name</label>
            <input
              className="wa-input"
              style={{ fontSize: 18, padding: '12px 14px' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Your name"
              autoFocus
            />
            <div className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 6 }}>
              ↳ shown to teammates, not stored after session ends
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label className="wa-label">Role (optional)</label>
            <div className="wa-seg" style={{ display: 'flex' }}>
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={role === r ? 'is-on' : ''}
                  onClick={() => setRole(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 6, letterSpacing: '0.04em' }}>
              ↳ used for filtering · IC is fine for most engineers
            </div>
          </div>

          <button
            className="wa-btn"
            style={{ padding: '12px 20px', fontSize: 14 }}
            onClick={handleJoin}
            disabled={joining || !name.trim()}
          >
            {joining ? 'Joining…' : `Join ${session?.name ?? 'session'} →`}
          </button>

          {session && (
            <p style={{ marginTop: 28, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              {session.participants?.length > 0
                ? `${session.participants.length} ${session.participants.length === 1 ? 'person is' : 'people are'} already inside.`
                : 'Be the first to join!'
              }
              {session.status === 'lobby' ? ' Submissions open when the facilitator hits start.' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
