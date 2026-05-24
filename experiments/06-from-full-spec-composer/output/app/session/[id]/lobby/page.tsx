'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SessionProvider, useSessionContext, SessionConnectionFallback } from '@/hooks/useSession';
import { Avatar, Brand, Topbar } from '@/components/ui';
import { getFacilitatorToken } from '@/lib/client/storage';
import { emitSessionStart } from '@/lib/socket';
import type { Participant } from '@/lib/domain/types';

function elapsedSince(d: Date) {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `+${secs}s`;
  return `+${Math.floor(secs / 60)}m`;
}

function LobbyInner({ sessionId, token }: { sessionId: string; token: string }) {
  const router = useRouter();
  const { session, loading, joinError, retryJoin } = useSessionContext();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [joinTimes, setJoinTimes] = useState<Map<string, Date>>(new Map());
  const initialIdsRef = useRef<Set<string> | null>(null);

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/session/${sessionId}`
      : '';
  const joinUrlDisplay = joinUrl.replace(/^https?:\/\//, '');

  useEffect(() => {
    if (session?.status === 'active') {
      router.push(`/session/${sessionId}/facilitator?token=${token}`);
    }
  }, [session?.status, sessionId, token, router]);

  useEffect(() => {
    if (!session) return;
    const engineers = session.participants.filter((p) => !p.isFacilitator);
    if (initialIdsRef.current === null) {
      initialIdsRef.current = new Set(engineers.map((p) => p.id));
      return;
    }
    setJoinTimes((prev) => {
      const next = new Map(prev);
      for (const p of engineers) {
        if (!initialIdsRef.current!.has(p.id) && !next.has(p.id)) {
          next.set(p.id, new Date());
        }
      }
      return next;
    });
  }, [session?.participants, session]);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const start = async () => {
    setStarting(true);
    emitSessionStart({ sessionId, token });
    await fetch(`/api/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    router.push(`/session/${sessionId}/facilitator?token=${token}`);
  };

  if (joinError) {
    return <SessionConnectionFallback message={joinError} onRetry={retryJoin} />;
  }

  if (loading || !session) {
    return (
      <div className="wa-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        Connecting…
      </div>
    );
  }

  const participants = session.participants.filter((p) => !p.isFacilitator);

  return (
    <div className="wa-screen">
      <Topbar
        left={
          <>
            <Brand />
            <div style={{ height: 20, width: 1, background: 'var(--rule)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{session.name}</div>
              <div className="wa-eyebrow" style={{ fontSize: 10 }}>
                FACILITATOR · LOBBY · WAITING
              </div>
            </div>
          </>
        }
        right={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              className="wa-dot is-pulsing"
              style={{ background: participants.length > 0 ? 'var(--sage)' : 'var(--muted-2)' }}
            />
            <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {participants.length} JOINED
            </span>
          </span>
        }
      />
      <div className="wa-layout-2col">
        <div style={{ padding: '48px 40px', overflowY: 'auto' }}>
          <p className="wa-eyebrow">Share with your team</p>
          <h1 className="wa-display" style={{ fontSize: 32, margin: '8px 0 28px' }}>
            Send everyone this link.
          </h1>

          <div className="wa-card" style={{ padding: 18, marginBottom: 20 }}>
            <p className="wa-eyebrow" style={{ marginBottom: 10 }}>
              Join URL
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <code
                className="wa-mono"
                style={{
                  fontSize: 14,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {joinUrlDisplay}
              </code>
              <button type="button" className="wa-btn is-ghost" onClick={copyUrl}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <p className="wa-eyebrow" style={{ marginBottom: 8 }}>
              Or share the session ID
            </p>
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--border-soft)',
                borderRadius: 4,
                padding: '10px 12px',
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Session ID</div>
              <div
                className="wa-mono"
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--rust)',
                  letterSpacing: '0.06em',
                }}
              >
                {sessionId}
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              Engineers can also enter this at the join page.
            </p>
          </div>

          <hr className="wa-rule" style={{ margin: '0 0 24px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="wa-btn is-rust"
              onClick={start}
              disabled={starting}
            >
              {starting ? 'Starting…' : 'Start submissions →'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              You can also wait — engineers can join any time before you start.
            </span>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: '12px 14px',
              background: 'var(--sage-bg)',
              border: '1px solid #c8d2b1',
              borderRadius: 4,
              fontSize: 12,
              color: '#3b4a2b',
              lineHeight: 1.5,
            }}
          >
            <strong>Late joiners are first-class.</strong> Engineers can join after the round starts
            and see what&apos;s already been logged.
          </div>
        </div>

        <div style={{ padding: '32px 40px', background: 'var(--cream)', overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <h2 className="wa-display" style={{ fontSize: 22, margin: 0 }}>
              Joined
            </h2>
            <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {participants.length} in room
            </span>
          </div>

          {participants.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>◌</div>
              Waiting for engineers to join…
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {participants.map((p: Participant) => (
                <div
                  key={p.id}
                  className="wa-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                  }}
                >
                  <Avatar initials={p.initials} color={p.color} size="lg" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {p.role}
                    </div>
                  </div>
                  {joinTimes.has(p.id) && (
                    <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)' }}>
                      {elapsedSince(joinTimes.get(p.id)!)}
                    </span>
                  )}
                  <span className="wa-dot" style={{ background: 'var(--sage)', marginRight: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LobbyPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');

  useEffect(() => {
    setToken(searchParams.get('token') ?? getFacilitatorToken(params.id) ?? '');
  }, [searchParams, params.id]);

  if (!token) {
    return (
      <div className="wa-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        Facilitator token required
      </div>
    );
  }

  return (
    <SessionProvider
      sessionId={params.id}
      joinParams={{ name: 'Facilitator', isFacilitator: true, token }}
    >
      <LobbyInner sessionId={params.id} token={token} />
    </SessionProvider>
  );
}
