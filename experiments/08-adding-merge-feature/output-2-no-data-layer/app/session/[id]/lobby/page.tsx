'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { socket } from '@/lib/socket';

type Participant = {
  id: string; name: string; role: string; color: string; initials: string; joinedAt: string;
};

export default function FacilitatorLobby({ params }: { params: { id: string } }) {
  const { id } = params;
  const router      = useRouter();
  const searchParams = useSearchParams();

  const [session, setSession]           = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied]             = useState(false);
  const [starting, setStarting]         = useState(false);
  const [joinTimes, setJoinTimes]       = useState<Map<string, Date>>(new Map());

  // Token: prefer URL param (survives tab changes), fall back to localStorage
  const token        = searchParams.get('token') ?? (typeof window !== 'undefined' ? localStorage.getItem(`wa-token-${id}`) ?? '' : '');
  const sessionURL   = typeof window !== 'undefined' ? `${window.location.origin}/session/${id}/join` : '';

  const fetchSession = useCallback(async () => {
    const res  = await fetch(`/api/sessions/${id}`);
    const data = await res.json();
    if (res.ok) {
      setSession(data);
      setParticipants(data.participants ?? []);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
    socket.connect();
    socket.emit('join-session', {
      sessionId: id,
      name: localStorage.getItem(`wa-name-${id}`) ?? 'Facilitator',
      role: 'Other',
      isFacilitator: true,
      token,
    });

    socket.on('session:state', (data: any) => {
      setSession(data);
      setParticipants(data.participants ?? []);
    });
    socket.on('participant:joined', (p: Participant) => {
      setParticipants(prev => [...prev.filter(x => x.id !== p.id), p]);
      setJoinTimes(prev => new Map(prev).set(p.id, new Date()));
    });
    socket.on('participant:left', ({ id: pid }: { id: string }) => {
      setParticipants(prev => prev.filter(x => x.id !== pid));
    });
    socket.on('session:status', ({ status }: { status: string }) => {
      if (status === 'active') router.push(`/session/${id}/facilitator?token=${token}`);
    });

    return () => {
      socket.off('session:state');
      socket.off('participant:joined');
      socket.off('participant:left');
      socket.off('session:status');
      socket.disconnect();
    };
  }, [id, token, fetchSession, router]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sessionURL);
    } catch {
      const el = document.createElement('textarea');
      el.value = sessionURL;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    setStarting(true);
    socket.emit('session:start', { sessionId: id, token });
    // fallback REST call
    await fetch(`/api/sessions/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    router.push(`/session/${id}/facilitator?token=${token}`);
  };

  const elapsedSince = (d: Date | string) => {
    const secs = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (secs < 60) return `+${secs}s`;
    return `+${Math.floor(secs / 60)}m`;
  };

  if (!session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--paper)' }}>
        <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Loading session…</span>
      </div>
    );
  }

  return (
    <div className="wa-layout">
      {/* Topbar */}
      <div className="wa-topbar">
        <a href="/" className="wa-brand"><span className="wa-brandmark">W</span><span>Work Audit</span></a>
        <div style={{ height: 20, width: 1, background: 'var(--rule)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{session.name}</div>
          <div className="wa-eyebrow" style={{ fontSize: 10 }}>FACILITATOR · LOBBY · WAITING</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="wa-dot is-pulsing" style={{ background: participants.length > 0 ? 'var(--sage)' : 'var(--muted-2)' }} />
            <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {participants.length} JOINED
            </span>
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', flex: 1, overflow: 'hidden' }}>

        {/* LEFT — share link */}
        <div style={{ padding: '48px 56px', borderRight: '1px solid var(--rule)', overflowY: 'auto' }}>
          <span className="wa-eyebrow">Share with your team</span>
          <h2 className="wa-display" style={{ fontSize: 32, margin: '10px 0 28px', fontWeight: 500 }}>
            Send everyone this link.
          </h2>

          <div style={{ background: '#fff', border: '1px solid var(--rule)', borderRadius: 6, padding: 18, marginBottom: 20 }}>
            <div className="wa-eyebrow" style={{ marginBottom: 10 }}>Join URL</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <code className="wa-mono" style={{
                fontSize: 14, color: 'var(--ink)', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {sessionURL.replace(/^https?:\/\//, '')}
              </code>
              <button className="wa-btn is-ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div className="wa-eyebrow" style={{ marginBottom: 8 }}>Or share the session ID</div>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border-soft)', borderRadius: 4, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Session ID</div>
              <div className="wa-mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--rust)', letterSpacing: '0.06em' }}>{id}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              Engineers can also enter this at the join page.
            </div>
          </div>

          <hr className="wa-rule" style={{ margin: '0 0 24px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="wa-btn is-rust" onClick={handleStart} disabled={starting}>
              {starting ? 'Starting…' : 'Start submissions →'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              You can also wait — engineers can join any time before you start.
            </span>
          </div>

          <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--sage-bg)', border: '1px solid #c8d2b1', borderRadius: 4, fontSize: 12, color: '#3b4a2b', lineHeight: 1.5 }}>
            <strong>Late joiners are first-class.</strong> Engineers can join after the round starts and see what&apos;s already been logged.
          </div>
        </div>

        {/* RIGHT — joined list */}
        <div style={{ padding: '32px 40px', background: 'var(--cream)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 className="wa-display" style={{ fontSize: 22, margin: 0, fontWeight: 500 }}>Joined</h3>
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
              {participants.map((p) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: '#fff',
                  border: '1px solid var(--border-soft)', borderRadius: 4,
                }}>
                  <span className="wa-avatar" style={{ background: p.color, color: '#fff' }}>{p.initials}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{p.role}</div>
                  </div>
                  <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)' }}>
                    {joinTimes.has(p.id) ? elapsedSince(joinTimes.get(p.id)!) : ''}
                  </span>
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
