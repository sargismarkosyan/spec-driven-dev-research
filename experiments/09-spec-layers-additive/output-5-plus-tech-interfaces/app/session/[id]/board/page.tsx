'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import {
  QuestionBlock, QStrip, EffortPill, ActivityChipsShort, Avatar,
  TPO_SHORT, FREQ_SHORT, ENERGY_SHORT, ENERGY_TONE,
  type TimePerOccurrence, type Frequency, type Energy,
} from '@/app/components/Primitives';
import { PROMPT_CATEGORIES, type PromptExample } from '@/lib/categories';

type Activity = {
  id: string;
  participantId: string;
  participantName: string;
  participantInitials: string;
  participantColor: string;
  title: string;
  tpo: TimePerOccurrence;
  freq: Frequency;
  energy: Energy;
  teamAuto: string;
  flagged: boolean;
  discussionNote: string;
  createdAt: string;
};

type Participant = {
  id: string; name: string; role: string; color: string; initials: string;
};


export default function EngineerBoard({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  const [session, setSession]           = useState<any>(null);
  const [activities, setActivities]     = useState<Activity[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myId, setMyId]                 = useState<string>('');
  const [myName, setMyName]             = useState<string>('');
  const [myInitials, setMyInitials]     = useState<string>('');
  const [myColor, setMyColor]           = useState<string>('');
  const [timer, setTimer]               = useState<string>('');
  const [timerUrgent, setTimerUrgent]   = useState(false);
  const [adding, setAdding]             = useState(false);

  // New activity form state (only used when adding — edits happen inline)
  const [newTitle, setNewTitle]   = useState('');
  const [newTpo, setNewTpo]       = useState<TimePerOccurrence>('30m-2h');
  const [newFreq, setNewFreq]     = useState<Frequency>('weekly');
  const [newEnergy, setNewEnergy] = useState<Energy>('fine');
  const [saving, setSaving]       = useState(false);

  // Soft-delete with 5s undo toast
  const [pendingDelete, setPendingDelete] = useState<Activity | null>(null);
  const pendingDeleteRef = useRef<Activity | null>(null);
  const pendingTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startedAtRef = useRef<Date | null>(null);
  const windowMinRef = useRef<number>(10);

  // ── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const tick = () => {
      if (!startedAtRef.current || windowMinRef.current === 0 || session?.status !== 'active') {
        setTimer(''); setTimerUrgent(false); return;
      }
      const elapsed   = (Date.now() - startedAtRef.current.getTime()) / 1000;
      const remaining = windowMinRef.current * 60 - elapsed;
      if (remaining <= 0) { setTimer('Time up'); setTimerUrgent(true); return; }
      const m = Math.floor(remaining / 60);
      const s = Math.floor(remaining % 60);
      setTimer(`${m}:${String(s).padStart(2, '0')}`);
      setTimerUrgent(remaining < 120);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [session?.status]);

  // ── Socket ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const name = localStorage.getItem(`wa-eng-name-${id}`) ?? '';
    const role = (localStorage.getItem(`wa-eng-role-${id}`) ?? 'IC') as any;
    if (!name) { router.push(`/session/${id}/join`); return; }
    setMyName(name);

    socket.connect();
    socket.emit('join-session', { sessionId: id, name, role });

    socket.on('session:state', (data: any) => {
      setSession(data);
      setActivities(data.activities ?? []);
      setParticipants(data.participants ?? []);
      if (data.startedAt) startedAtRef.current = new Date(data.startedAt);
      windowMinRef.current = data.submissionWindowMin ?? 10;
      // Find my participant record (by name match — socket.id changes on reload)
      const me = (data.participants ?? []).find((p: Participant) => p.name === name);
      if (me) { setMyId(me.id); setMyInitials(me.initials); setMyColor(me.color); }
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
    socket.on('activity:merged', ({ merged, removedId }: { merged: Activity; removedId: string }) => {
      setActivities(prev => [...prev.filter(x => x.id !== removedId && x.id !== merged.id), merged]);
    });
    socket.on('participant:joined', (p: Participant) => {
      setParticipants(prev => [...prev.filter(x => x.id !== p.id), p]);
    });
    socket.on('participant:left', ({ id: pid }: { id: string }) => {
      setParticipants(prev => prev.filter(x => x.id !== pid));
    });
    socket.on('session:status', ({ status }: { status: string }) => {
      // Just update session state in-place; the render logic handles each status
      setSession((prev: any) => prev ? { ...prev, status } : prev);
    });
    socket.on('session:extended', ({ submissionWindowMin }: { submissionWindowMin: number }) => {
      windowMinRef.current = submissionWindowMin;
    });
    socket.on('connect', () => {
      // After reconnect, identify
      socket.emit('join-session', { sessionId: id, name, role });
    });
    // Surface server-side rejections (e.g. ownership / session-not-found)
    // so silent drops are visible. We log to the console; we can promote this
    // to a toast later if useful.
    socket.on('error', (msg: string) => {
      console.warn('[socket error]', msg);
    });
    socket.on('connect_error', (err: any) => {
      console.warn('[socket connect_error]', err?.message ?? err);
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
      socket.off('connect');
      socket.off('error');
      socket.off('connect_error');
      socket.disconnect();
    };
  }, [id, router]);

  // Keep myId in sync as socket assigns it
  useEffect(() => {
    const me = participants.find(p => p.name === myName);
    if (me && me.id !== myId) {
      setMyId(me.id);
      setMyInitials(me.initials);
      setMyColor(me.color);
    }
  }, [participants, myName, myId]);

  const myActivities = activities
    .filter(a => a.participantId === myId || a.participantName === myName)
    .filter(a => a.id !== pendingDelete?.id);
  const teamFeed     = activities.filter(a => a.participantName !== myName).slice(-8).reverse();
  const suggestions  = buildSuggestions(teamFeed, myActivities);
  const sessionStatus: 'lobby' | 'active' | 'discussion' | 'done' = session?.status ?? 'lobby';

  // ── Save / inline-update / soft-delete ───────────────────────────────────

  const handleSave = useCallback(async (andContinue = false) => {
    if (!newTitle.trim()) return;
    setSaving(true);
    socket.emit('activity:add', {
      sessionId: id, title: newTitle.trim(),
      tpo: newTpo, freq: newFreq, energy: newEnergy,
    });
    setNewTitle(''); setNewTpo('30m-2h'); setNewFreq('weekly'); setNewEnergy('fine');
    setSaving(false);
    if (!andContinue) setAdding(false);
  }, [id, newTitle, newTpo, newFreq, newEnergy]);

  // Per-field inline update. Server accepts partial patches and rebroadcasts.
  const updateActivity = useCallback((
    activityId: string,
    patch: Partial<Pick<Activity, 'title' | 'tpo' | 'freq' | 'energy'>>,
  ) => {
    socket.emit('activity:update', { sessionId: id, activityId, ...patch });
  }, [id]);

  // Commit any in-flight pending delete to the server (used when user starts
  // a new delete or when the 5s timer fires).
  const commitPending = useCallback(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    const a = pendingDeleteRef.current;
    if (a) {
      socket.emit('activity:delete', { sessionId: id, activityId: a.id });
    }
    pendingDeleteRef.current = null;
    setPendingDelete(null);
  }, [id]);

  // Request delete: hide locally, show toast, commit after 5s unless undone.
  const requestDelete = useCallback((activity: Activity) => {
    if (pendingDeleteRef.current && pendingDeleteRef.current.id !== activity.id) {
      // A prior delete is still in its undo window — commit it before starting a new one.
      commitPending();
    }
    pendingDeleteRef.current = activity;
    setPendingDelete(activity);
    pendingTimerRef.current = setTimeout(() => {
      socket.emit('activity:delete', { sessionId: id, activityId: activity.id });
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

  // Cleanup on unmount: abort the pending delete (assume user changed mind).
  useEffect(() => () => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  }, []);

  const useSuggestion = (ex: PromptExample | string) => {
    if (typeof ex === 'string') {
      setNewTitle(ex);
    } else {
      setNewTitle(ex.title);
      setNewTpo(ex.tpo);
      setNewFreq(ex.freq);
    }
    setAdding(true);
    setTimeout(() => document.getElementById('new-title-input')?.focus(), 50);
  };

  // ── Lobby: waiting for facilitator to start ─────────────────────────────
  if (!session || sessionStatus === 'lobby') {
    return (
      <div className="wa-layout">
        <div className="wa-topbar">
          <a href="/" className="wa-brand"><span className="wa-brandmark">W</span><span>Work Audit</span></a>
          <div style={{ height: 20, width: 1, background: 'var(--rule)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{session?.name ?? '…'}</div>
            <div className="wa-eyebrow" style={{ fontSize: 10 }}>ENGINEER VIEW · WAITING TO START</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {myColor && <span className="wa-avatar is-sm" style={{ background: myColor, color: '#fff' }}>{myInitials}</span>}
            {myName && <span style={{ fontSize: 12, fontWeight: 500 }}>{myName}</span>}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 48 }}>
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.25 }}>◌</div>
            <h2 className="wa-display" style={{ fontSize: 28, margin: '0 0 12px', fontWeight: 500 }}>
              Waiting for the session to start.
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
              The session is open — you&apos;re in. Submissions will begin as soon as the facilitator
              hits &quot;Start submissions&quot; in the lobby. You&apos;ll see the board automatically.
            </p>
          </div>
          {participants.length > 0 && (
            <div style={{ width: '100%', maxWidth: 380 }}>
              <div className="wa-eyebrow" style={{ marginBottom: 12, textAlign: 'center' }}>
                {participants.length} {participants.length === 1 ? 'person' : 'people'} in the room
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {participants.map(p => (
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

  // ── Discussion: read-only results view ───────────────────────────────────
  if (sessionStatus === 'discussion' || sessionStatus === 'done') {
    const flagged    = activities.filter(a => a.flagged);
    const classified = activities.filter(a => a.teamAuto !== 'unclassified');
    return (
      <div className="wa-layout">
        <div className="wa-topbar">
          <a href="/" className="wa-brand"><span className="wa-brandmark">W</span><span>Work Audit</span></a>
          <div style={{ height: 20, width: 1, background: 'var(--rule)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{session?.name}</div>
            <div className="wa-eyebrow" style={{ fontSize: 10 }}>DISCUSSION IN PROGRESS</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="wa-tick">{classified.length}/{activities.length} classified</span>
            <span style={{ width: 1, height: 16, background: 'var(--rule)' }} />
            {myColor && <><span className="wa-avatar is-sm" style={{ background: myColor, color: '#fff' }}>{myInitials}</span><span style={{ fontSize: 12, fontWeight: 500 }}>{myName}</span></>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, overflow: 'hidden' }}>
          {/* My activities with live verdicts */}
          <main style={{ padding: '28px 36px', overflowY: 'auto', background: 'var(--cream)' }}>
            <span className="wa-eyebrow">Your submitted activities</span>
            <h2 className="wa-display" style={{ fontSize: 26, margin: '8px 0 20px', fontWeight: 500 }}>
              Discussion is live — verdicts appearing in real time.
            </h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {myActivities.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--muted-2)', fontStyle: 'italic' }}>You didn&apos;t submit any activities.</div>
              ) : (
                myActivities.map((a, i) => {
                  const autoColor = a.teamAuto === 'yes' ? 'is-rust' : a.teamAuto === 'maybe' ? 'is-amber' : a.teamAuto === 'no' ? 'is-slate' : 'is-ghost';
                  const autoLabel = { yes: 'Automatable', maybe: 'Maybe', no: 'Manual', unclassified: 'Not reviewed yet' }[a.teamAuto] ?? 'Not reviewed yet';
                  return (
                    <div key={a.id} className={`wa-activity${a.flagged ? ' wa-flagged' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)' }}>{String(i + 1).padStart(2, '0')}</span>
                        <p className="wa-activity-title" style={{ margin: 0, flex: 1 }}>{a.title}</p>
                        {a.flagged && <span style={{ color: 'var(--flag)', fontSize: 14 }}>★</span>}
                        <EffortPill tpo={a.tpo} freq={a.freq} />
                        <span className={`wa-chip ${autoColor}`} style={{ fontWeight: 600 }}>
                          {a.teamAuto === 'unclassified' ? <span style={{ opacity: 0.5 }}>Pending…</span> : autoLabel}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 10 }}>
                        <QStrip label="Time" value={a.tpo} options={[['<30m','<30 min'],['30m-2h','30m–2h'],['half-day','½ day'],['day+','1+ day']]} />
                        <QStrip label="Frequency" value={a.freq} options={[['daily','Daily'],['weekly','Wkly'],['monthly','Mthly'],['quarterly','Qtrly'],['adhoc','Ad hoc']]} />
                        <QStrip label="Energy" value={a.energy} options={[['energizing','Energizes'],['fine','Fine'],['tedious','Tedious'],['draining','Drains']]} />
                      </div>
                      {a.discussionNote && (
                        <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--paper)', borderRadius: 4, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                          <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', marginRight: 6 }}>↳ NOTE</span>
                          {a.discussionNote}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ marginTop: 28, padding: '14px 16px', background: 'var(--paper)', border: '1px solid var(--border-soft)', borderRadius: 4, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              The facilitator is walking through each activity with the team and deciding on automatability. You&apos;ll see verdicts and flags appear above as they happen.
            </div>
          </main>
          {/* Flagged priorities sidebar */}
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
                  <div key={a.id} style={{ background: '#fff', borderLeft: '3px solid var(--rust)', border: '1px solid var(--rust-bg)', borderRadius: 4, padding: '8px 10px' }}>
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
              <div style={{ width: `${activities.length > 0 ? (classified.length / activities.length) * 100 : 0}%`, height: '100%', background: 'var(--ink)', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{activities.length - classified.length} activities still to review.</div>
          </aside>
        </div>
      </div>
    );
  }

  // ── Active: submission board ─────────────────────────────────────────────
  return (
    <div className="wa-layout">
      {/* Topbar */}
      <div className="wa-topbar">
        <a href="/" className="wa-brand"><span className="wa-brandmark">W</span><span>Work Audit</span></a>
        <div style={{ height: 20, width: 1, background: 'var(--rule)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{session?.name ?? id}</div>
          <div className="wa-eyebrow" style={{ fontSize: 10 }}>
            ENGINEER VIEW · IN PROGRESS
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {timer && (
            <>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '5px 10px', borderRadius: 4,
                background: timerUrgent ? 'var(--rust-bg)' : 'var(--paper)',
                border: `1px solid ${timerUrgent ? '#e8c8b8' : 'var(--border-soft)'}`,
                transition: 'background 0.4s',
              }}>
                <span className="wa-dot is-pulsing" style={{ background: timerUrgent ? 'var(--rust)' : 'var(--sage)', marginRight: 0 }} />
                <span className="wa-mono" style={{
                  fontSize: 13, fontWeight: 600,
                  color: timerUrgent ? 'var(--rust)' : 'var(--ink)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.04em',
                }}>
                  {timer}
                </span>
                {timer !== 'Time up' && <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>LEFT</span>}
              </div>
              <span style={{ width: 1, height: 16, background: 'var(--rule)' }} />
            </>
          )}
          <span className="wa-tick">{myActivities.length} activities</span>
          <span style={{ width: 1, height: 16, background: 'var(--rule)' }} />
          {myColor ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="wa-avatar is-sm" style={{ background: myColor, color: '#fff' }}>{myInitials}</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{myName}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 296px', flex: 1, overflow: 'hidden' }}>

        {/* LEFT — categorized recall rail */}
        <PromptRail
          enabledCategories={session?.enabledCategories}
          onSelectExample={useSuggestion}
        />

        {/* CENTER — activities */}
        <main style={{ padding: '28px 36px', overflowY: 'auto', background: 'var(--cream)' }}>

          <div style={{ maxWidth: 920 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: myActivities.length > 0 ? 14 : 0 }}>
              <div>
                <span className="wa-eyebrow">Submitting as {myName} · {myActivities.length} activities</span>
                {myActivities.length === 0 ? (
                  <>
                    <h2 className="wa-display" style={{ fontSize: 28, margin: '10px 0 14px', fontWeight: 500 }}>
                      List the recurring work you do.
                    </h2>
                    <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.55, maxWidth: 580, marginBottom: 28 }}>
                      One activity per card. Be specific but quick — &quot;Triage Sentry alerts&quot; not &quot;deal with errors.&quot;
                      Three questions per card. You can edit anything before discussion starts.
                    </p>
                  </>
                ) : (
                  <h2 className="wa-display" style={{ fontSize: 26, margin: '8px 0 0', fontWeight: 500 }}>
                    Your recurring work
                  </h2>
                )}
              </div>
            </div>

            {/* Existing activities */}
            {myActivities.length > 0 && (
              <>
                <div className="wa-quick-hint">
                  <span className="wa-mono">↳</span>
                  <span>Tap any answer to change it. Hover a title to rename.</span>
                </div>
                <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                  {myActivities.map((a, i) => (
                    <div key={a.id} className="wa-activity">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)', flexShrink: 0 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <EditableTitle
                          title={a.title}
                          onSave={(t) => updateActivity(a.id, { title: t })}
                        />
                        <EffortPill tpo={a.tpo} freq={a.freq} />
                        <button
                          type="button"
                          className="wa-card-action"
                          onClick={() => requestDelete(a)}
                          title="Remove activity"
                          aria-label={`Remove activity: ${a.title}`}
                        >×</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 10 }}>
                        <QStrip label="Time per occurrence" value={a.tpo}
                          options={[['<30m', '< 30 min'], ['30m-2h', '30m–2h'], ['half-day', '½ day'], ['day+', '1+ day']]}
                          onChange={v => updateActivity(a.id, { tpo: v as TimePerOccurrence })}
                        />
                        <QStrip label="How often" value={a.freq}
                          options={[['daily', 'Daily'], ['weekly', 'Wkly'], ['monthly', 'Mthly'], ['quarterly', 'Qtrly'], ['adhoc', 'Ad hoc']]}
                          onChange={v => updateActivity(a.id, { freq: v as Frequency })}
                        />
                        <QStrip label="Energy" value={a.energy}
                          options={[['energizing', 'Energizes'], ['fine', 'Fine'], ['tedious', 'Tedious'], ['draining', 'Drains']]}
                          onChange={v => updateActivity(a.id, { energy: v as Energy })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Add activity form */}
            {adding ? (
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
                onCancel={() => setAdding(false)}
              />
            ) : null}

            {/* Add button / empty state prompt */}
            {!adding && (
              <button
                onClick={() => { setAdding(true); setNewTitle(''); }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: myActivities.length === 0 ? '22px 22px' : '14px 18px',
                  background: '#fff',
                  border: '1.5px dashed var(--rule)',
                  borderRadius: 6, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12,
                  color: 'var(--muted)',
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
                    {myActivities.length === 0 ? 'Start with what you did yesterday or this morning' : 'Keep listing — aim for 5+'}
                  </div>
                </div>
                <span className="wa-mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-2)' }}>↵</span>
              </button>
            )}

            {/* Done notice */}
            {myActivities.length > 0 && !adding && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginTop: 16,
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

        {/* RIGHT — suggestions + live team feed */}
        <aside style={{
          borderLeft: '1px solid var(--rule)',
          background: 'var(--paper)',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <div className="wa-eyebrow" style={{ color: 'var(--rust)' }}>↳ Have you got these too?</div>
                <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{suggestions.length}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, lineHeight: 1.45 }}>
                Pulled from your team&apos;s submissions. Tap to draft a card —
              </p>
              <p style={{ fontSize: 10.5, color: 'var(--muted-2)', marginBottom: 10, lineHeight: 1.45, fontStyle: 'italic' }}>
                you&apos;ll answer the 3 questions for <em>your</em> situation. Daily for Sarah might be weekly for you.
              </p>
              <div style={{ display: 'grid', gap: 6 }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => useSuggestion(s.text)}
                    style={{
                      background: '#fff', border: '1px dashed var(--rust)',
                      borderRadius: 4, padding: '9px 10px', textAlign: 'left', cursor: 'pointer',
                      display: 'flex', gap: 8, alignItems: 'flex-start',
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

          {/* Live team feed */}
          <div style={{ padding: '18px 18px 24px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
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
                      <EffortPill tpo={a.tpo} freq={a.freq} size="sm" />
                      <span className={`wa-chip ${ENERGY_TONE[a.energy]}`} style={{ padding: '2px 5px', fontSize: 10 }}>
                        {ENERGY_SHORT[a.energy]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Undo toast for soft delete */}
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

// ── Inline editable title — pencil-on-hover, Enter/blur to save ───────────

function EditableTitle({ title, onSave }: { title: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(title);
  const inputRef              = useRef<HTMLInputElement | null>(null);

  // Reset draft when the underlying title changes externally and we're not editing.
  useEffect(() => { if (!editing) setDraft(title); }, [title, editing]);

  // Autofocus + select on entering edit mode.
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

// ── Categorized prompt rail ────────────────────────────────────────────────

function PromptRail({ enabledCategories, onSelectExample }: {
  enabledCategories?: string[];
  onSelectExample: (ex: PromptExample) => void;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    // First 3 categories open by default
    new Set(PROMPT_CATEGORIES.slice(0, 3).map(c => c.id))
  );

  const visibleCategories = enabledCategories
    ? PROMPT_CATEGORIES.filter(c => enabledCategories.includes(c.id))
    : PROMPT_CATEGORIES;

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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
      <div className="wa-eyebrow" style={{ marginBottom: 8 }}>↳ Recall prompts</div>
      <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 14 }}>
        Tap an example to pre-fill a card title. Don&apos;t filter — list everything.
      </p>
      <div style={{ display: 'grid', gap: 2 }}>
        {visibleCategories.map(cat => {
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

// ── Activity form ──────────────────────────────────────────────────────────

function ActivityForm({
  title, tpo, freq, energy,
  onTitleChange, onTpoChange, onFreqChange, onEnergyChange,
  onSave, onSaveAndAdd, onCancel, isEdit,
}: {
  title: string; tpo: TimePerOccurrence; freq: Frequency; energy: Energy;
  onTitleChange: (v: string) => void;
  onTpoChange: (v: TimePerOccurrence) => void;
  onFreqChange: (v: Frequency) => void;
  onEnergyChange: (v: Energy) => void;
  onSave: () => void; onSaveAndAdd: () => void; onCancel: () => void;
  isEdit?: boolean;
}) {
  return (
    <div className="wa-card" style={{ padding: 22, marginBottom: 16, boxShadow: '0 1px 0 var(--border), 0 8px 28px rgba(28,26,22,0.06)' }}>
      <label className="wa-label">What&apos;s the activity?</label>
      <input
        id="new-title-input"
        className="wa-input"
        style={{ fontSize: 16, padding: '12px 14px', marginBottom: 6 }}
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Triage Sentry alerts each morning"
        autoFocus
      />
      <div style={{ fontSize: 11, color: 'var(--muted-2)', marginBottom: 22, display: 'flex', gap: 8 }}>
        <span className="wa-mono">↳</span>
        <span>One activity per card · be specific but quick</span>
      </div>

      <div style={{ display: 'grid', gap: 18 }}>
        <QuestionBlock
          num="01" q="How long does this take, each time?"
          hint='Honest average — including the "just one more thing" stretch'
          options={[
            ['<30m', 'Under 30 min', 'minutes'],
            ['30m-2h', '30 min – 2 hrs', 'a couple hours'],
            ['half-day', 'Half a day', 'a chunk'],
            ['day+', 'A full day or more', 'all in'],
          ]}
          value={tpo}
          onChange={v => onTpoChange(v as TimePerOccurrence)}
        />
        <QuestionBlock
          num="02" q="How often does it happen?"
          hint="Roughly — pick the nearest cadence"
          options={[
            ['daily', 'Daily', 'every day'],
            ['weekly', 'Weekly', 'each week'],
            ['monthly', 'Monthly', 'each month'],
            ['quarterly', 'Quarterly', 'each quarter'],
            ['adhoc', 'Ad hoc', 'unpredictable'],
          ]}
          value={freq}
          onChange={v => onFreqChange(v as Frequency)}
        />
        <QuestionBlock
          num="03" q="How does it feel to do?"
          hint="Gut check — energy is fine to share honestly"
          options={[
            ['energizing', 'Energizes me', 'I like doing it'],
            ['fine', "It's fine", 'No complaints'],
            ['tedious', 'Tedious', 'Rather skip it'],
            ['draining', 'Drains me', 'I dread it'],
          ]}
          value={energy}
          onChange={v => onEnergyChange(v as Energy)}
        />
      </div>

      <hr className="wa-rule" style={{ margin: '18px 0 16px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="wa-btn" onClick={onSave} disabled={!title.trim()}>
          {isEdit ? 'Save changes' : 'Save activity'}
        </button>
        {!isEdit && (
          <button className="wa-btn is-ghost" onClick={onSaveAndAdd} disabled={!title.trim()}>
            Save &amp; add another
          </button>
        )}
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

// ── Build suggestions from team feed ─────────────────────────────────────

function buildSuggestions(teamFeed: Activity[], mine: Activity[]): { text: string; who: string; count: number }[] {
  const myTitles = new Set(mine.map(a => a.title.toLowerCase().slice(0, 20)));
  const seen = new Map<string, { text: string; who: string; count: number }>();

  for (const a of teamFeed) {
    const key = a.title.toLowerCase().slice(0, 30);
    if (myTitles.has(key.slice(0, 20))) continue;
    if (seen.has(key)) {
      seen.get(key)!.count++;
    } else {
      seen.set(key, { text: a.title, who: a.participantName.split(' ')[0], count: 1 });
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}
