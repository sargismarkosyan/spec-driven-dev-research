'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import {
  ActivityChipsShort, EffortPill, QStrip, Topbar,
  TPO_SHORT, TPO_LABEL, FREQ_SHORT, FREQ_LABEL, ENERGY_SHORT, ENERGY_LABEL, ENERGY_TONE, AUTO_TONE,
  type TimePerOccurrence, type Frequency, type Energy,
  type Activity, type Participant, type Session,
} from '@/app/components/Primitives';
import { PROMPT_CATEGORIES, type PromptExample } from '@/lib/categories';

// ── Types ──────────────────────────────────────────────────────────────────

type FormTpo = TimePerOccurrence | null;
type FormFreq = Frequency | null;
type FormEnergy = Energy | null;

type Suggestion = { text: string; who: string; count: number };

// ── Helpers ────────────────────────────────────────────────────────────────

function buildSuggestions(teamFeed: Activity[], mine: Activity[]): Suggestion[] {
  const myTitles = new Set(mine.map(a => a.title.toLowerCase().trim().slice(0, 20)));
  const seen = new Map<string, Suggestion>();
  for (const a of teamFeed) {
    const key = a.title.toLowerCase().trim().slice(0, 30);
    if (myTitles.has(key.slice(0, 20))) continue;
    if (seen.has(key)) {
      seen.get(key)!.count++;
    } else {
      seen.set(key, { text: a.title, who: a.participantName.split(' ')[0], count: 1 });
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.count - a.count).slice(0, 4);
}

function fmtTimer(remaining: number): string {
  if (remaining <= 0) return 'Time up';
  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function EngineerBoard() {
  const params   = useParams();
  const id       = params.id as string;
  const router   = useRouter();

  const [session, setSession]           = useState<Session | null>(null);
  const [activities, setActivities]     = useState<Activity[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myName, setMyName]             = useState('');
  const [myInitials, setMyInitials]     = useState('');
  const [myColor, setMyColor]           = useState('');
  const [timer, setTimer]               = useState('');
  const [timerUrgent, setTimerUrgent]   = useState(false);
  const [adding, setAdding]             = useState(false);
  const [error, setError]               = useState('');

  // Add form state
  const [newTitle,  setNewTitle]  = useState('');
  const [newTpo,    setNewTpo]    = useState<FormTpo>('30m-2h');
  const [newFreq,   setNewFreq]   = useState<FormFreq>('weekly');
  const [newEnergy, setNewEnergy] = useState<FormEnergy>('fine');

  // Soft-delete with 5s undo window
  const [pendingDelete, setPendingDelete] = useState<Activity | null>(null);
  const pendingDeleteRef = useRef<Activity | null>(null);
  const pendingTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startedAtRef = useRef<Date | null>(null);
  const windowMinRef = useRef<number>(0);

  // ── Timer ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const tick = () => {
      if (!startedAtRef.current || windowMinRef.current === 0 || session?.status !== 'active') {
        setTimer(''); setTimerUrgent(false); return;
      }
      const elapsed   = (Date.now() - startedAtRef.current.getTime()) / 1000;
      const remaining = windowMinRef.current * 60 - elapsed;
      setTimer(fmtTimer(remaining));
      setTimerUrgent(remaining > 0 && remaining < 120);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [session?.status]);

  // ── Socket ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const name = localStorage.getItem(`wa-eng-name-${id}`) ?? '';
    const role = (localStorage.getItem(`wa-eng-role-${id}`) ?? 'IC') as Participant['role'];
    if (!name) { router.push(`/session/${id}/join`); return; }
    setMyName(name);

    const socket = getSocket();
    socket.connect();
    socket.emit('join-session', { sessionId: id, name, role });

    socket.on('session:state', (data: Session & { activities: Activity[]; participants: Participant[] }) => {
      setSession(data);
      setActivities(data.activities ?? []);
      setParticipants(data.participants ?? []);
      if (data.startedAt) startedAtRef.current = new Date(data.startedAt);
      windowMinRef.current = data.submissionWindowMin ?? 0;
      const me = (data.participants ?? []).find((p: Participant) => p.name === name);
      if (me) { setMyInitials(me.initials); setMyColor(me.color); }
    });

    socket.on('activity:added', (a: Activity) => {
      setActivities(prev => [...prev.filter(x => x.id !== a.id), a]);
    });
    socket.on('activity:updated', (a: Activity) => {
      setActivities(prev => prev.map(x => x.id === a.id ? a : x));
    });
    socket.on('activity:deleted', ({ id: aid }: { id: string }) => {
      setActivities(prev => prev.filter(x => x.id !== aid));
    });
    socket.on('activity:merged', ({ newActivity, updatedSources }: { newActivity: Activity; updatedSources: Activity[] }) => {
      setActivities(prev => {
        const sourceIds = new Set(updatedSources.map(s => s.id));
        return [...prev.filter(x => !sourceIds.has(x.id)), ...updatedSources, newActivity];
      });
    });
    socket.on('participant:joined', (p: Participant) => {
      setParticipants(prev => [...prev.filter(x => x.id !== p.id), p]);
      if (p.name === name) { setMyInitials(p.initials); setMyColor(p.color); }
    });
    socket.on('participant:left', ({ id: pid }: { id: string }) => {
      setParticipants(prev => prev.filter(x => x.id !== pid));
    });
    socket.on('session:status', ({ status }: { status: string }) => {
      setSession(prev => prev ? { ...prev, status: status as Session['status'] } : prev);
    });
    socket.on('session:extended', ({ submissionWindowMin }: { submissionWindowMin: number }) => {
      windowMinRef.current = submissionWindowMin;
      setSession(prev => prev ? { ...prev, submissionWindowMin } : prev);
    });
    socket.on('session:settings', (settings: Partial<Pick<Session, 'liveTeamFeed' | 'enabledCategories'>>) => {
      setSession(prev => prev ? { ...prev, ...settings } : prev);
    });
    socket.on('connect', () => {
      socket.emit('join-session', { sessionId: id, name, role });
    });
    socket.on('error', (msg: string) => {
      setError(typeof msg === 'string' ? msg : 'Connection error');
    });

    return () => {
      socket.off('session:state');
      socket.off('activity:added');
      socket.off('activity:updated');
      socket.off('activity:deleted');
      socket.off('activity:merged');
      socket.off('participant:joined');
      socket.off('participant:left');
      socket.off('session:status');
      socket.off('session:extended');
      socket.off('session:settings');
      socket.off('connect');
      socket.off('error');
      socket.disconnect();
    };
  }, [id, router]);

  // Keep identity in sync after reconnect
  useEffect(() => {
    const me = participants.find(p => p.name === myName);
    if (me) { setMyInitials(me.initials); setMyColor(me.color); }
  }, [participants, myName]);

  // ── Derived data ────────────────────────────────────────────────────────

  const myActivities = activities
    .filter(a => a.participantName === myName)
    .filter(a => a.id !== pendingDelete?.id);

  const liveTeamFeed = session?.liveTeamFeed ?? false;
  const teamFeed     = liveTeamFeed
    ? activities.filter(a => a.participantName !== myName).slice(-8).reverse()
    : [];
  const suggestions  = liveTeamFeed ? buildSuggestions(teamFeed, myActivities) : [];

  const sessionStatus = session?.status ?? 'lobby';

  // ── Save ────────────────────────────────────────────────────────────────

  const handleSave = useCallback((andContinue = false) => {
    if (!newTitle.trim() || !newTpo || !newFreq || !newEnergy) return;
    const socket = getSocket();
    socket.emit('activity:add', {
      sessionId: id,
      title: newTitle.trim(),
      tpo: newTpo,
      freq: newFreq,
      energy: newEnergy,
    });
    if (andContinue) {
      // Save & add another: clear to null (no pre-selection)
      setNewTitle('');
      setNewTpo(null);
      setNewFreq(null);
      setNewEnergy(null);
      setTimeout(() => document.getElementById('new-title-input')?.focus(), 50);
    } else {
      setNewTitle('');
      setNewTpo('30m-2h');
      setNewFreq('weekly');
      setNewEnergy('fine');
      setAdding(false);
    }
  }, [id, newTitle, newTpo, newFreq, newEnergy]);

  const updateActivity = useCallback((
    activityId: string,
    patch: Partial<Pick<Activity, 'title' | 'tpo' | 'freq' | 'energy'>>,
  ) => {
    const socket = getSocket();
    socket.emit('activity:update', { sessionId: id, activityId, ...patch });
  }, [id]);

  // ── Soft delete ─────────────────────────────────────────────────────────

  const commitPending = useCallback(() => {
    if (pendingTimerRef.current) { clearTimeout(pendingTimerRef.current); pendingTimerRef.current = null; }
    const a = pendingDeleteRef.current;
    if (a) { getSocket().emit('activity:delete', { sessionId: id, activityId: a.id }); }
    pendingDeleteRef.current = null;
    setPendingDelete(null);
  }, [id]);

  const requestDelete = useCallback((activity: Activity) => {
    // Commit any prior pending delete immediately before starting a new one
    if (pendingDeleteRef.current && pendingDeleteRef.current.id !== activity.id) {
      commitPending();
    }
    pendingDeleteRef.current = activity;
    setPendingDelete(activity);
    pendingTimerRef.current = setTimeout(() => {
      getSocket().emit('activity:delete', { sessionId: id, activityId: activity.id });
      pendingDeleteRef.current = null;
      pendingTimerRef.current = null;
      setPendingDelete(null);
    }, 5000);
  }, [id, commitPending]);

  const undoDelete = useCallback(() => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
    pendingDeleteRef.current = null;
    setPendingDelete(null);
  }, []);

  // On unmount: cancel pending delete (spec: navigate away = implicit undo)
  useEffect(() => () => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  }, []);

  // ── Prompt / suggestion pre-fill ────────────────────────────────────────

  const openFormWithPrompt = useCallback((ex: PromptExample) => {
    setNewTitle(ex.title);
    setNewTpo(ex.tpo as TimePerOccurrence);
    setNewFreq(ex.freq as Frequency);
    setNewEnergy(null); // energy not pre-filled from prompts
    setAdding(true);
    setTimeout(() => document.getElementById('new-title-input')?.focus(), 50);
  }, []);

  const openFormWithSuggestion = useCallback((title: string) => {
    setNewTitle(title);
    setNewTpo('30m-2h'); // defaults for suggestion
    setNewFreq('weekly');
    setNewEnergy('fine');
    setAdding(true);
    setTimeout(() => document.getElementById('new-title-input')?.focus(), 50);
  }, []);

  // ── Error state ─────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="wa-layout">
        <Topbar title="Work Audit" sub="ENGINEER VIEW" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--rust)' }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Connection error</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── LOBBY ───────────────────────────────────────────────────────────────

  if (!session || sessionStatus === 'lobby') {
    const engineerParticipants = participants.filter(p => p.role !== ('facilitator' as string));
    return (
      <div className="wa-layout">
        <Topbar
          title={session?.name ?? '…'}
          sub="ENGINEER VIEW · WAITING TO START"
          right={
            myColor ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="wa-avatar is-sm" style={{ background: myColor, color: '#fff' }}>{myInitials}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{myName}</span>
              </div>
            ) : null
          }
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 48 }}>
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.25 }}>◌</div>
            <h2 className="wa-display" style={{ fontSize: 28, margin: '0 0 12px', fontWeight: 500 }}>
              Waiting for the session to start.
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
              The session is open — you&apos;re in. Submissions will begin as soon as the facilitator
              hits &ldquo;Start submissions&rdquo; in the lobby. You&apos;ll see the board automatically.
            </p>
          </div>
          {engineerParticipants.length > 0 && (
            <div style={{ width: '100%', maxWidth: 400 }}>
              <div className="wa-eyebrow" style={{ marginBottom: 12, textAlign: 'center' }}>
                {engineerParticipants.length} {engineerParticipants.length === 1 ? 'person' : 'people'} in the room
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {engineerParticipants.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 4 }}>
                    <span className="wa-avatar is-sm" style={{ background: p.color, color: '#fff' }}>{p.initials}</span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</span>
                    <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── DISCUSSION / DONE ───────────────────────────────────────────────────

  if (sessionStatus === 'discussion' || sessionStatus === 'done') {
    const flagged    = activities.filter(a => a.flagged);
    const classified = activities.filter(a => a.teamAuto !== 'unclassified');

    return (
      <div className="wa-layout">
        <Topbar
          title={session.name}
          sub="DISCUSSION IN PROGRESS"
          right={
            <>
              <span className="wa-tick">{classified.length}/{activities.length} classified</span>
              <span style={{ width: 1, height: 16, background: 'var(--rule)' }} />
              {myColor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="wa-avatar is-sm" style={{ background: myColor, color: '#fff' }}>{myInitials}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{myName}</span>
                </div>
              )}
            </>
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 296px', flex: 1, overflow: 'hidden' }}>
          {/* Main: own activities read-only */}
          <main style={{ padding: '28px 36px', overflowY: 'auto', background: 'var(--cream)' }}>
            <span className="wa-eyebrow">Your submitted activities</span>
            <h2 className="wa-display" style={{ fontSize: 26, margin: '8px 0 20px', fontWeight: 500 }}>
              Discussion is live — verdicts appearing in real time.
            </h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {myActivities.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--muted-2)', fontStyle: 'italic' }}>
                  You didn&apos;t submit any activities.
                </div>
              ) : (
                myActivities.map((a, i) => {
                  const autoColor = AUTO_TONE[a.teamAuto] ?? 'is-ghost';
                  const autoLabel: Record<string, string> = {
                    yes: 'Automatable', maybe: 'Maybe', no: 'Manual', unclassified: 'Pending…',
                  };
                  return (
                    <div key={a.id} className="wa-activity">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)', flexShrink: 0 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="wa-activity-title" style={{ margin: 0, flex: 1 }}>{a.title}</p>
                        {a.flagged && <span style={{ color: 'var(--flag)', fontSize: 14 }}>★</span>}
                        <EffortPill activity={a} />
                        <span
                          className={`wa-chip ${autoColor}`}
                          style={{ fontWeight: 600, opacity: a.teamAuto === 'unclassified' ? 0.5 : 1 }}
                        >
                          {autoLabel[a.teamAuto] ?? 'Pending…'}
                        </span>
                      </div>
                      <ActivityChipsShort activity={a} />
                      {a.discussionNote && (
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                          {a.discussionNote}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--paper)', border: '1px solid var(--border-soft)', borderRadius: 4, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              The facilitator is walking through each activity with the team and deciding on automatability.
              You&apos;ll see verdicts and flags appear above as they happen.
            </div>
          </main>

          {/* Sidebar: flagged priorities + progress */}
          <aside style={{ borderLeft: '1px solid var(--rule)', background: 'var(--paper)', overflowY: 'auto', padding: '24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="wa-eyebrow" style={{ color: flagged.length > 0 ? 'var(--rust)' : undefined }}>
                ★ Flagged priorities
              </div>
              <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{flagged.length}</span>
            </div>
            {flagged.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted-2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                None flagged yet — the list grows as the facilitator marks priorities.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {flagged.map((a, i) => (
                  <div key={a.id} style={{
                    background: '#fff',
                    borderLeft: '3px solid var(--rust)',
                    border: '1px solid var(--rust-bg)',
                    borderRadius: 4,
                    padding: '8px 10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="wa-avatar is-sm" style={{ background: a.participantColor, color: '#fff' }}>{a.participantInitials}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{a.participantName.split(' ')[0]}</span>
                      <span style={{ color: 'var(--flag)', marginLeft: 'auto' }}>★</span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.3 }}>{a.title}</div>
                  </div>
                ))}
              </div>
            )}
            <hr className="wa-rule" style={{ margin: '20px 0 14px' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="wa-eyebrow">Progress</div>
              <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{classified.length}/{activities.length}</span>
            </div>
            <div style={{ height: 6, background: 'var(--paper-deep)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                width: `${activities.length > 0 ? (classified.length / activities.length) * 100 : 0}%`,
                height: '100%',
                background: 'var(--ink)',
                transition: 'width 0.4s',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {activities.length - classified.length} activities still to review.
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ── ACTIVE ──────────────────────────────────────────────────────────────

  return (
    <div className="wa-layout">
      {/* Topbar */}
      <Topbar
        title={session.name ?? id}
        sub="ENGINEER VIEW · IN PROGRESS"
        right={
          <>
            {timer && (
              <>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px', borderRadius: 4,
                  background: timerUrgent ? 'var(--rust-bg)' : 'var(--paper)',
                  border: `1px solid ${timerUrgent ? '#e8c8b8' : 'var(--border-soft)'}`,
                  transition: 'background 0.4s',
                }}>
                  <span
                    className="wa-dot is-pulsing"
                    style={{ background: timerUrgent ? 'var(--rust)' : 'var(--sage)' }}
                  />
                  <span className="wa-mono" style={{
                    fontSize: 13, fontWeight: 600,
                    color: timerUrgent ? 'var(--rust)' : 'var(--ink)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.04em',
                  }}>
                    {timer}
                  </span>
                  {timer !== 'Time up' && (
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>LEFT</span>
                  )}
                </div>
                <span style={{ width: 1, height: 16, background: 'var(--rule)' }} />
              </>
            )}
            {myColor && (
              <>
                <span className="wa-tick">{myActivities.length} activities</span>
                <span style={{ width: 1, height: 16, background: 'var(--rule)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="wa-avatar is-sm" style={{ background: myColor, color: '#fff' }}>{myInitials}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{myName}</span>
                </div>
              </>
            )}
          </>
        }
      />

      {/* Body: 3-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 296px', flex: 1, overflow: 'hidden' }}>

        {/* LEFT — prompt rail */}
        <PromptRail
          enabledCategories={session.enabledCategories}
          onSelectExample={openFormWithPrompt}
        />

        {/* CENTER — activities */}
        <main style={{ padding: '28px 36px', overflowY: 'auto', background: 'var(--cream)' }}>
          <div style={{ maxWidth: 920 }}>
            {/* Persistent eyebrow */}
            <span className="wa-eyebrow">
              Submitting as {myName} · {myActivities.length} activities
            </span>

            {myActivities.length === 0 && !adding ? (
              <>
                <h2 className="wa-display" style={{ fontSize: 28, margin: '10px 0 14px', fontWeight: 500 }}>
                  List the recurring work you do.
                </h2>
                <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.55, maxWidth: 580, marginBottom: 28 }}>
                  One activity per card. Be specific but quick — &ldquo;Triage Sentry alerts&rdquo; not &ldquo;deal with errors.&rdquo;
                  Three questions per card. You can edit anything before discussion starts.
                </p>
              </>
            ) : (
              <h2 className="wa-display" style={{ fontSize: 26, margin: '8px 0 12px', fontWeight: 500 }}>
                Your recurring work
              </h2>
            )}

            {/* Activity cards */}
            {myActivities.length > 0 && (
              <>
                {!adding && (
                  <div className="wa-quick-hint" style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                    Tap any answer to change it. Hover a title to rename.
                  </div>
                )}
                <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                  {myActivities.map((a, i) => (
                    <div key={a.id} className="wa-activity">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)', flexShrink: 0 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <EditableTitle
                          title={a.title}
                          onSave={t => updateActivity(a.id, { title: t })}
                        />
                        <EffortPill activity={a} />
                        <button
                          type="button"
                          className="wa-card-action"
                          onClick={() => requestDelete(a)}
                          title="Remove activity"
                          aria-label={`Remove: ${a.title}`}
                        >×</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 10 }}>
                        <div>
                          <div className="wa-mono" style={{ fontSize: 9, color: 'var(--muted-2)', marginBottom: 4, textTransform: 'uppercase' }}>Time</div>
                          <QStrip
                            options={['<30m', '30m-2h', 'half-day', 'day+'] as TimePerOccurrence[]}
                            value={a.tpo}
                            labelMap={TPO_SHORT}
                            onChange={v => updateActivity(a.id, { tpo: v })}
                          />
                        </div>
                        <div>
                          <div className="wa-mono" style={{ fontSize: 9, color: 'var(--muted-2)', marginBottom: 4, textTransform: 'uppercase' }}>Frequency</div>
                          <QStrip
                            options={['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'] as Frequency[]}
                            value={a.freq}
                            labelMap={FREQ_SHORT}
                            onChange={v => updateActivity(a.id, { freq: v })}
                          />
                        </div>
                        <div>
                          <div className="wa-mono" style={{ fontSize: 9, color: 'var(--muted-2)', marginBottom: 4, textTransform: 'uppercase' }}>Energy</div>
                          <QStrip
                            options={['energizing', 'fine', 'tedious', 'draining'] as Energy[]}
                            value={a.energy}
                            labelMap={ENERGY_SHORT}
                            onChange={v => updateActivity(a.id, { energy: v })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Add form */}
            {adding && (
              <ActivityForm
                title={newTitle}
                tpo={newTpo}
                freq={newFreq}
                energy={newEnergy}
                onTitleChange={setNewTitle}
                onTpoChange={setNewTpo}
                onFreqChange={setNewFreq}
                onEnergyChange={setNewEnergy}
                onSave={() => handleSave(false)}
                onSaveAndAdd={() => handleSave(true)}
                onCancel={() => {
                  setAdding(false);
                  setNewTitle('');
                  setNewTpo('30m-2h');
                  setNewFreq('weekly');
                  setNewEnergy('fine');
                }}
              />
            )}

            {/* Add button */}
            {!adding && (
              <button
                onClick={() => {
                  setNewTitle('');
                  setNewTpo('30m-2h');
                  setNewFreq('weekly');
                  setNewEnergy('fine');
                  setAdding(true);
                  setTimeout(() => document.getElementById('new-title-input')?.focus(), 50);
                }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: myActivities.length === 0 ? '22px 22px' : '14px 18px',
                  background: '#fff',
                  border: '1.5px dashed var(--rule)',
                  borderRadius: 6, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  marginBottom: 12, color: 'var(--muted)',
                }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--ink)', color: 'var(--cream)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 500, flexShrink: 0,
                }}>+</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                    {myActivities.length === 0 ? 'Add your first activity' : 'Add another activity'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {myActivities.length === 0
                      ? 'Start with what you did yesterday or this morning'
                      : 'Keep listing — aim for 5+'}
                  </div>
                </div>
                <span className="wa-mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-2)' }}>↵</span>
              </button>
            )}

            {/* Done banner */}
            {myActivities.length > 0 && !adding && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', background: 'var(--sage-bg)',
                borderRadius: 4, border: '1px solid #c8d2b1',
              }}>
                <span style={{ color: 'var(--sage)', fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 13, color: '#3b4a2b' }}>
                  You&apos;re done. Tweak anything until the facilitator starts the discussion.
                </span>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT — suggestions + team feed */}
        <aside style={{
          borderLeft: '1px solid var(--rule)',
          background: 'var(--paper)',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Suggestions (only when liveTeamFeed is true and there are suggestions) */}
          {liveTeamFeed && suggestions.length > 0 && (
            <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <div className="wa-eyebrow" style={{ color: 'var(--rust)' }}>↳ Have you got these too?</div>
                <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{suggestions.length}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, lineHeight: 1.45 }}>
                Pulled from your team&apos;s submissions. Tap to draft a card —
              </p>
              <p style={{ fontSize: 10.5, color: 'var(--muted-2)', marginBottom: 10, lineHeight: 1.45, fontStyle: 'italic' }}>
                you&apos;ll answer the 3 questions for your situation. Daily for Sarah might be weekly for you.
              </p>
              <div style={{ display: 'grid', gap: 6 }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => openFormWithSuggestion(s.text)}
                    style={{
                      background: '#fff', border: '1px dashed var(--rust)',
                      borderRadius: 4, padding: '9px 10px', textAlign: 'left',
                      cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ color: 'var(--rust)', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1, paddingTop: 1, flexShrink: 0 }}>+</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3, marginBottom: 3 }}>{s.text}</div>
                      <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.04em' }}>
                        ↳ {s.who}{s.count > 1 ? ` · ${s.count} on the team` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Team feed (only when liveTeamFeed is true) */}
          {liveTeamFeed && (
            <div style={{ padding: '18px 18px 24px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="wa-eyebrow">↳ Team is submitting</div>
                <span className="wa-dot is-pulsing" />
              </div>
              {teamFeed.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted-2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  Activities from teammates will appear here as they submit.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {teamFeed.map(a => (
                    <div key={a.id} style={{ background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 4, padding: '9px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span className="wa-avatar is-sm" style={{ background: a.participantColor, color: '#fff' }}>
                          {a.participantInitials}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{a.participantName.split(' ')[0]}</span>
                        <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', marginLeft: 'auto' }}>just now</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.35, marginBottom: 6 }}>{a.title}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                        <EffortPill activity={a} />
                        <span className={`wa-chip ${ENERGY_TONE[a.energy]}`} style={{ padding: '2px 5px', fontSize: 10 }}>
                          {ENERGY_SHORT[a.energy]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Undo toast */}
      {pendingDelete && (
        <div className="wa-undo-toast" role="status" aria-live="polite">
          <div className="wa-undo-msg">
            <span>
              Removed <strong style={{ fontWeight: 600 }}>&ldquo;{pendingDelete.title}&rdquo;</strong>
            </span>
            <div className="wa-undo-bar" key={pendingDelete.id}><span /></div>
          </div>
          <button type="button" onClick={undoDelete} autoFocus>Undo</button>
        </div>
      )}
    </div>
  );
}

// ── Editable title ─────────────────────────────────────────────────────────

function EditableTitle({ title, onSave }: { title: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(title);
  const inputRef              = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (!editing) setDraft(title); }, [title, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== title) onSave(next);
    setDraft(next || title);
    setEditing(false);
  };
  const cancel = () => { setDraft(title); setEditing(false); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="wa-title-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter')  { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
        aria-label="Edit activity title"
        style={{ flex: 1 }}
      />
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <p className="wa-activity-title" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title}
      </p>
      <button
        type="button"
        className="wa-pencil-trigger"
        onClick={() => setEditing(true)}
        title="Rename activity"
        aria-label="Rename activity"
      >✎</button>
    </div>
  );
}

// ── Prompt rail ────────────────────────────────────────────────────────────

function PromptRail({
  enabledCategories,
  onSelectExample,
}: {
  enabledCategories?: string[];
  onSelectExample: (ex: PromptExample) => void;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    new Set(PROMPT_CATEGORIES.slice(0, 3).map(c => c.id))
  );

  const visible = enabledCategories
    ? PROMPT_CATEGORIES.filter(c => enabledCategories.includes(c.id))
    : PROMPT_CATEGORIES;

  const toggle = (catId: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  return (
    <aside style={{
      padding: '20px 16px',
      borderRight: '1px solid var(--rule)',
      background: 'var(--paper)',
      overflowY: 'auto',
    }}>
      <div className="wa-eyebrow" style={{ marginBottom: 8 }}>Prompts</div>
      <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 14 }}>
        Tap an example to pre-fill a card title. Don&apos;t filter — list everything.
      </p>
      <div style={{ display: 'grid', gap: 2 }}>
        {visible.map(cat => {
          const open = openIds.has(cat.id);
          return (
            <div key={cat.id}>
              <button
                onClick={() => toggle(cat.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '7px 8px',
                  background: open ? 'var(--paper-deep)' : 'transparent',
                  border: '1px solid transparent', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span className="wa-mono" style={{ fontSize: 9, color: 'var(--muted-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cat.label.toUpperCase()}
                </span>
                <span className="wa-mono" style={{ fontSize: 9, color: 'var(--muted-2)', flexShrink: 0 }}>
                  {open ? '▲' : '▼'}
                </span>
              </button>
              {open && (
                <div style={{ paddingLeft: 4, paddingBottom: 6, display: 'grid', gap: 2 }}>
                  {cat.examples.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectExample(ex)}
                      style={{
                        padding: '5px 8px', borderRadius: 3, fontSize: 11.5,
                        color: 'var(--ink-2)', background: '#fff',
                        border: '1px solid var(--border-soft)',
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.background = 'var(--cream)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.background = '#fff'; }}
                    >
                      <span style={{ color: 'var(--rust)', fontFamily: 'var(--font-mono)', fontSize: 10, flexShrink: 0 }}>+</span>
                      <span>{ex.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ── Option button helper (for add form with null support) ──────────────────

function OptionBtn<T extends string>({
  value, selected, label, sub, onSelect,
}: {
  value: T; selected: boolean; label: string; sub: string; onSelect: (v: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      style={{
        flex: 1, padding: '8px 6px', borderRadius: 4, cursor: 'pointer',
        border: selected ? '1.5px solid var(--ink)' : '1px solid var(--border-soft)',
        background: selected ? 'var(--ink)' : '#fff',
        color: selected ? 'var(--cream)' : 'var(--ink)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        transition: 'background 0.15s, border-color 0.15s',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: selected ? 600 : 400, lineHeight: 1.2, textAlign: 'center' }}>{label}</span>
      <span style={{ fontSize: 9.5, opacity: 0.65, fontFamily: 'var(--font-mono)', textAlign: 'center' }}>{sub}</span>
    </button>
  );
}

// ── Activity form ──────────────────────────────────────────────────────────

function ActivityForm({
  title, tpo, freq, energy,
  onTitleChange, onTpoChange, onFreqChange, onEnergyChange,
  onSave, onSaveAndAdd, onCancel,
}: {
  title: string;
  tpo: FormTpo; freq: FormFreq; energy: FormEnergy;
  onTitleChange: (v: string) => void;
  onTpoChange: (v: FormTpo) => void;
  onFreqChange: (v: FormFreq) => void;
  onEnergyChange: (v: FormEnergy) => void;
  onSave: () => void;
  onSaveAndAdd: () => void;
  onCancel: () => void;
}) {
  const canSave = title.trim().length > 0 && tpo !== null && freq !== null && energy !== null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="wa-card" style={{ padding: 22, marginBottom: 16, boxShadow: '0 1px 0 var(--border), 0 8px 28px rgba(28,26,22,0.06)' }}>
      <label className="wa-label" style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
        What&apos;s the activity?
      </label>
      <input
        id="new-title-input"
        className="wa-input"
        style={{ fontSize: 16, padding: '12px 14px', marginBottom: 6, width: '100%', boxSizing: 'border-box' }}
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Triage Sentry alerts each morning"
        autoFocus
      />
      <div style={{ fontSize: 11, color: 'var(--muted-2)', marginBottom: 22, display: 'flex', gap: 8 }}>
        <span className="wa-mono">↳</span>
        <span>One activity per card · be specific but quick</span>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {/* Q01 — Time per occurrence */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>01</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>How long does this take, each time?</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 8 }}>
            Honest average — including the &ldquo;just one more thing&rdquo; stretch
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['<30m', '30m-2h', 'half-day', 'day+'] as TimePerOccurrence[]).map(v => (
              <OptionBtn
                key={v} value={v} selected={tpo === v}
                label={TPO_LABEL[v]} sub={v === '<30m' ? 'minutes' : v === '30m-2h' ? 'a couple hours' : v === 'half-day' ? 'a chunk' : 'all in'}
                onSelect={onTpoChange}
              />
            ))}
          </div>
        </div>

        {/* Q02 — Frequency */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>02</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>How often does it happen?</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 8 }}>
            Roughly — pick the nearest cadence
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'] as Frequency[]).map(v => (
              <OptionBtn
                key={v} value={v} selected={freq === v}
                label={FREQ_LABEL[v]} sub={v === 'daily' ? 'every day' : v === 'weekly' ? 'each week' : v === 'monthly' ? 'each month' : v === 'quarterly' ? 'each quarter' : 'unpredictable'}
                onSelect={onFreqChange}
              />
            ))}
          </div>
        </div>

        {/* Q03 — Energy */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>03</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>How does it feel to do?</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 8 }}>
            Gut check — energy is fine to share honestly
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['energizing', 'fine', 'tedious', 'draining'] as Energy[]).map(v => (
              <OptionBtn
                key={v} value={v} selected={energy === v}
                label={ENERGY_LABEL[v]} sub={v === 'energizing' ? 'I like doing it' : v === 'fine' ? 'No complaints' : v === 'tedious' ? 'Rather skip it' : 'I dread it'}
                onSelect={onEnergyChange}
              />
            ))}
          </div>
        </div>
      </div>

      <hr className="wa-rule" style={{ margin: '18px 0 16px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="wa-btn" onClick={onSave} disabled={!canSave}>
          Save activity
        </button>
        <button className="wa-btn is-ghost" onClick={onSaveAndAdd} disabled={!canSave}>
          Save &amp; add another
        </button>
        <button
          onClick={onCancel}
          style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', background: 'transparent', border: 0, cursor: 'pointer' }}
        >
          Esc · cancel
        </button>
      </div>
    </div>
  );
}
