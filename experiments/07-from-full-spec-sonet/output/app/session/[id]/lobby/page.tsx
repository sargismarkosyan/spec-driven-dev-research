'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Topbar, Toggle, Avatar } from '@/app/components/Primitives';
import type { Session, Participant } from '@/app/components/Primitives';
import { PROMPT_CATEGORIES, DEFAULT_ENABLED_CATEGORIES } from '@/lib/categories';
import { getSocket, resetSocket } from '@/lib/socket';

const WINDOW_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: 'Untimed', value: 0 },
];

type ParticipantEx = Participant & { isFacilitator?: boolean };
type ParticipantWithTime = ParticipantEx & { joinedTime?: number };

function elapsedText(joinedTime: number): string {
  const elapsed = Math.floor((Date.now() - joinedTime) / 1000);
  if (elapsed < 60) return `+${elapsed}s`;
  return `+${Math.floor(elapsed / 60)}m`;
}

export default function LobbyPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithTime[]>([]);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  // Settings (mirror session values, updated on PATCH)
  const [windowMin, setWindowMin] = useState(10);
  const [liveTeamFeed, setLiveTeamFeed] = useState(true);
  const [enabledCategories, setEnabledCategories] = useState<string[]>(DEFAULT_ENABLED_CATEGORIES);

  const socketConnected = useRef(false);

  // Resolve token from URL or localStorage
  useEffect(() => {
    if (!id) return;
    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get('token');
    const storedToken = localStorage.getItem(`wa-facilitator-token-${id}`);
    const resolved = urlToken || storedToken;
    if (resolved) {
      setToken(resolved);
      if (urlToken) localStorage.setItem(`wa-facilitator-token-${id}`, urlToken);
    }
  }, [id]);

  // Fetch session data
  useEffect(() => {
    if (!id || !token) return;
    fetch(`/api/sessions/${id}`)
      .then(res => res.json())
      .then((data: Session) => {
        setSession(data);
        setWindowMin(data.submissionWindowMin);
        setLiveTeamFeed(data.liveTeamFeed);
        setEnabledCategories(data.enabledCategories);
        const engineers = (data.participants as ParticipantEx[]).filter(p => !p.isFacilitator);
        setParticipants(engineers.map(p => ({ ...p, joinedTime: undefined })));
      })
      .catch(() => {/* ignore fetch errors */});
  }, [id, token]);

  // Socket connection
  useEffect(() => {
    if (!id || !token || socketConnected.current) return;
    socketConnected.current = true;

    const socket = getSocket();
    socket.connect();
    socket.emit('join-session', { sessionId: id, name: 'Facilitator', isFacilitator: true, token });

    socket.on('participant:joined', (participant: ParticipantEx) => {
      if (participant.isFacilitator) return;
      setParticipants(prev => {
        if (prev.some(p => p.id === participant.id)) return prev;
        return [...prev, { ...participant, joinedTime: Date.now() }];
      });
    });

    socket.on('participant:left', ({ id: leftId }: { id: string }) => {
      setParticipants(prev => prev.filter(p => p.id !== leftId));
    });

    socket.on('session:status', ({ status }: { status: string }) => {
      if (status === 'active') {
        router.replace(`/session/${id}/facilitator?token=${token}`);
      }
    });

    return () => {
      socket.off('participant:joined');
      socket.off('participant:left');
      socket.off('session:status');
      socketConnected.current = false;
      resetSocket();
    };
  }, [id, token, router]);

  const patchSettings = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!id || !token) return;
      await fetch(`/api/sessions/${id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-facilitator-token': token,
        },
        body: JSON.stringify(patch),
      }).catch(() => {/* ignore */});
    },
    [id, token],
  );

  const handleWindowChange = (val: number) => {
    setWindowMin(val);
    patchSettings({ submissionWindowMin: val });
  };

  const handleFeedChange = (val: boolean) => {
    setLiveTeamFeed(val);
    patchSettings({ liveTeamFeed: val });
  };

  const handleCategoryToggle = (catId: string) => {
    const next = enabledCategories.includes(catId)
      ? enabledCategories.filter(c => c !== catId)
      : [...enabledCategories, catId];
    if (next.length === 0) return;
    setEnabledCategories(next);
    patchSettings({ enabledCategories: next });
  };

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/session/${id}`
      : `/session/${id}`;
  const shareUrlDisplay = shareUrl.replace(/^https?:\/\//, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const handleStart = async () => {
    if (!token || starting) return;
    setStarting(true);

    const socket = getSocket();
    socket.emit('session:start', { sessionId: id, token });

    try {
      await fetch(`/api/sessions/${id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-facilitator-token': token,
        },
      });
    } catch {
      /* socket event covers it */
    }

    router.push(`/session/${id}/facilitator?token=${token}`);
  };

  const engineerCount = participants.length;
  const hasEngineers = engineerCount > 0;

  return (
    <div className="wa-layout">
      <Topbar
        title={session?.name ?? 'Loading…'}
        sub="FACILITATOR · LOBBY · WAITING"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className={`wa-dot${hasEngineers ? ' is-pulsing' : ''}`}
              style={{ background: hasEngineers ? 'var(--sage)' : 'var(--muted-2)' }}
            />
            <span className="wa-eyebrow">{engineerCount} JOINED</span>
          </div>
        }
      />

      <div
        className="wa-main"
        style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', flex: 1, overflow: 'hidden' }}
      >
        {/* Left column — share + settings */}
        <div className="wa-col" style={{ borderRight: '1px solid var(--border-soft)' }}>
          <div className="wa-col-scroll" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Share section header */}
            <div>
              <div className="wa-eyebrow" style={{ marginBottom: 8 }}>Share with your team</div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: 32,
                margin: 0,
                lineHeight: 1.15,
              }}>
                Send everyone this link.
              </h2>
            </div>

            {/* Join URL card */}
            <div className="wa-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="wa-eyebrow">Join URL</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12.5,
                  color: 'var(--ink)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {shareUrlDisplay}
                </span>
                <button
                  className="wa-btn is-ghost"
                  style={{ padding: '5px 12px', fontSize: 12, flexShrink: 0 }}
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Session ID section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="wa-eyebrow">Or share the session ID</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Session ID</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 20,
                color: 'var(--rust)',
                letterSpacing: '0.06em',
                fontWeight: 500,
                wordBreak: 'break-all',
              }}>
                {id}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                Engineers can also enter this at the join page.
              </p>
            </div>

            {/* Live settings panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Submission window */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="wa-label">Submission window</div>
                <div style={{
                  display: 'flex',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: '#fff',
                }}>
                  {WINDOW_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleWindowChange(opt.value)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        fontSize: 11.5,
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
              </div>

              {/* Live feed toggle */}
              <Toggle
                on={liveTeamFeed}
                onChange={handleFeedChange}
                label="Show live team feed to engineers"
              />

              {/* Category chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="wa-eyebrow">Prompt categories</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PROMPT_CATEGORIES.map(cat => {
                    const enabled = enabledCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryToggle(cat.id)}
                        style={{
                          padding: '4px 9px',
                          fontSize: 11.5,
                          borderRadius: 4,
                          border: enabled ? '1px solid #c8d2b1' : '1px dashed var(--border)',
                          background: enabled ? 'var(--sage-bg)' : 'transparent',
                          color: enabled ? '#3b4a2b' : 'var(--muted)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                          transition: 'all 0.12s',
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <hr className="wa-rule" />

            {/* Start button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="wa-btn is-rust"
                disabled={starting}
                onClick={handleStart}
                style={{ justifyContent: 'center', fontSize: 14, padding: '12px 20px' }}
              >
                {starting ? 'Starting…' : 'Start submissions →'}
              </button>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                You can also wait — engineers can join any time before you start.
              </p>
            </div>

            {/* Late joiners callout */}
            <div style={{
              background: 'var(--sage-bg)',
              border: '1px solid #c8d2b1',
              borderRadius: 6,
              padding: '12px 14px',
              fontSize: 13,
              color: '#3b4a2b',
              lineHeight: 1.55,
            }}>
              <strong>Late joiners are first-class.</strong> Engineers can join after the round starts and see what&apos;s already been logged.
            </div>
          </div>
        </div>

        {/* Right column — participants */}
        <div className="wa-col">
          <div className="wa-col-scroll" style={{ padding: '28px 24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: 22,
                margin: 0,
              }}>
                Joined
              </h3>
              <span className="wa-eyebrow">{engineerCount} in room</span>
            </div>

            {participants.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                paddingTop: 48,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: '2px solid var(--muted)',
                  opacity: 0.35,
                }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                  Waiting for engineers to join…
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {participants.map(p => (
                  <div
                    key={p.id}
                    className="wa-card"
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Avatar initials={p.initials} color={p.color} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        {p.name}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--muted)',
                        marginTop: 1,
                      }}>
                        {p.role}
                      </div>
                    </div>
                    {p.joinedTime && (
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--muted-2)',
                        flexShrink: 0,
                      }}>
                        {elapsedText(p.joinedTime)}
                      </span>
                    )}
                    <span className="wa-dot" style={{ background: 'var(--sage)', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
