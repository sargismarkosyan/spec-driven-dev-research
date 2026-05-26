'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import {
  Topbar, Eyebrow, Avatar, Chip, EffortPill, ActivityChipsShort,
  FacActions, MatrixDot, LegendDot, DetailRow, ClassifyBtn, Toggle,
  calcEffort, matrixCoords, clusterMatrixPositions, effortTone,
  TPO_SHORT, TPO_TONE, TPO_LABEL, FREQ_SHORT, FREQ_TONE, FREQ_LABEL,
  ENERGY_SHORT, ENERGY_TONE, AUTO_SHORT, AUTO_TONE, AUTO_LABEL,
  type TimePerOccurrence, type Frequency, type Energy, type AutoVerdict,
} from '@/app/components/Primitives';

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
  teamAuto: AutoVerdict;
  flagged: boolean;
  discussionNote: string;
  editHistory?: Array<{ who: string; what: string; at: string }>;
  createdAt: string;
  // Merge tracking — merged result fields
  mergedFromIds?: string[];
  mergedFromNames?: string[];
  mergedFromInitials?: string[];
  mergedFromColors?: string[];
  reportedBy?: string[];
  reportedByInitials?: string[];
  reportedByColors?: string[];
  // Merge tracking — source fields
  isMergedSource?: boolean;
  mergedIntoId?: string;
};

type MergeCandidate = Activity & {
  similarity: number;
  sameFreq: boolean;
  sameTpo: boolean;
};

type Participant = {
  id: string; name: string; role: string; color: string; initials: string; joinedAt: string;
};

type FacView = 'live' | 'matrix' | 'grouped' | 'discuss' | 'export';

export default function FacilitatorView({ params }: { params: { id: string } }) {
  const { id } = params;
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [session, setSession]           = useState<any>(null);
  const [activities, setActivities]     = useState<Activity[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [view, setView]                 = useState<FacView>('live');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [timer, setTimer]               = useState('');
  const [discussIdx, setDiscussIdx]     = useState(0);

  // Modals
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editTitle, setEditTitle]       = useState('');
  const [editTpo, setEditTpo]           = useState<TimePerOccurrence>('30m-2h');
  const [editFreq, setEditFreq]         = useState<Frequency>('weekly');
  const [editEnergy, setEditEnergy]     = useState<Energy>('fine');
  const [editVerdict, setEditVerdict]   = useState<AutoVerdict>('unclassified');
  const [editNote, setEditNote]         = useState('');
  const [showExport, setShowExport]     = useState(false);
  const [exportMd, setExportMd]         = useState('');
  const [copied, setCopied]             = useState(false);

  // Merge state
  const [mergeSource, setMergeSource]         = useState<Activity | null>(null);
  const [mergeSelected, setMergeSelected]     = useState<Set<string>>(new Set());
  const [mergeTitle, setMergeTitle]           = useState('');
  const [mergeTpo, setMergeTpo]               = useState<TimePerOccurrence>('30m-2h');
  const [mergeFreq, setMergeFreq]             = useState<Frequency>('weekly');
  const [mergeEnergy, setMergeEnergy]         = useState<Energy>('fine');
  const [mergeSearch, setMergeSearch]         = useState('');

  const startedAtRef = useRef<Date | null>(null);
  const windowMinRef = useRef<number>(10);
  const tickRef      = useRef<() => void>(() => {});
  // Token: prefer URL param, fall back to localStorage
  const token = searchParams.get('token') ?? (typeof window !== 'undefined' ? localStorage.getItem(`wa-token-${id}`) ?? '' : '');

  // ── Timer — tracks remaining + urgency level ──────────────────────────────

  const [timerUrgent, setTimerUrgent] = useState(false);

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
      setTimerUrgent(remaining < 120); // red when < 2 min left
    };
    tickRef.current = tick;
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [session?.status]);

  // ── Socket ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { router.push('/'); return; }
    const name = localStorage.getItem(`wa-name-${id}`) ?? 'Facilitator';

    socket.connect();
    socket.emit('join-session', { sessionId: id, name, role: 'Other', isFacilitator: true, token });

    socket.on('session:state', (data: any) => {
      setSession(data);
      setActivities(data.activities ?? []);
      setParticipants(data.participants ?? []);
      if (data.startedAt) startedAtRef.current = new Date(data.startedAt);
      windowMinRef.current = data.submissionWindowMin ?? 10;
      if (data.status === 'discussion') setView('discuss');
    });
    socket.on('activity:added',   (a: Activity) => setActivities(prev => [...prev.filter(x => x.id !== a.id), a]));
    socket.on('activity:updated', (a: Activity) => {
      setActivities(prev => prev.map(x => x.id === a.id ? a : x));
      setSelectedActivity(prev => prev?.id === a.id ? a : prev);
    });
    socket.on('activity:deleted', ({ id: aid }: { id: string }) => {
      setActivities(prev => prev.filter(x => x.id !== aid));
      if (selectedActivity?.id === aid) setSelectedActivity(null);
    });
    socket.on('participant:joined', (p: Participant) => setParticipants(prev => [...prev.filter(x => x.id !== p.id), p]));
    socket.on('participant:left',   ({ id: pid }: { id: string }) => setParticipants(prev => prev.filter(x => x.id !== pid)));
    socket.on('session:extended',   ({ submissionWindowMin: w }: { submissionWindowMin: number }) => { windowMinRef.current = w; });
    socket.on('session:status',     ({ status }: { status: string }) => {
      setSession((prev: any) => prev ? { ...prev, status } : prev);
      if (status === 'discussion') setView('discuss');
    });
    socket.on('activity:merged', ({ newActivity, updatedSources }: {
      newActivity: Activity; updatedSources: Activity[];
    }) => {
      setActivities(prev => {
        // Replace updated sources (now marked isMergedSource), add the new merged activity
        const updatedMap = new Map(updatedSources.map(a => [a.id, a]));
        const replaced = prev.map(a => updatedMap.has(a.id) ? updatedMap.get(a.id)! : a);
        // Add new merged activity if not already present
        if (!replaced.find(a => a.id === newActivity.id)) {
          return [...replaced, newActivity];
        }
        return replaced;
      });
    });

    return () => {
      ['session:state','activity:added','activity:updated','activity:deleted',
        'participant:joined','participant:left','session:extended','session:status',
        'activity:merged'].forEach(e => socket.off(e));
      socket.disconnect();
    };
  }, [id, token, router]);

  // ── Facilitator actions ───────────────────────────────────────────────────

  const handleStart = () => socket.emit('session:start', { sessionId: id, token });
  const handleClose = () => {
    socket.emit('session:close', { sessionId: id, token });
    // Optimistic update — stop the timer and switch view immediately
    setSession((prev: any) => prev ? { ...prev, status: 'discussion' } : prev);
    setView('discuss');
  };
  const handleExtend = (mins: number) => {
    if (startedAtRef.current) {
      const elapsedMin = (Date.now() - startedAtRef.current.getTime()) / 60000;
      if (windowMinRef.current <= elapsedMin) {
        // Expired — snap to now + added minutes so remaining goes positive
        windowMinRef.current = Math.ceil(elapsedMin) + mins;
      } else {
        windowMinRef.current += mins;
      }
    } else {
      windowMinRef.current += mins;
    }
    tickRef.current(); // re-render timer display immediately, don't wait for next interval
    socket.emit('session:extend', { sessionId: id, token, addMinutes: mins });
  };

  const handleClassify = useCallback((activityId: string, verdict: AutoVerdict) => {
    socket.emit('activity:classify', { sessionId: id, activityId, verdict, token });
  }, [id, token]);

  const handleFlag = useCallback((activityId: string, flagged: boolean, note?: string) => {
    socket.emit('activity:flag', { sessionId: id, activityId, flagged, note, token });
  }, [id, token]);

  const handleNote = useCallback((activityId: string, note: string) => {
    socket.emit('activity:note', { sessionId: id, activityId, note, token });
  }, [id, token]);

  const handleRemove = useCallback((activityId: string) => {
    if (!confirm('Remove this activity?')) return;
    socket.emit('activity:delete', { sessionId: id, activityId, token });
  }, [id, token]);

  const openEdit = (a: Activity) => {
    setEditActivity(a);
    setEditTitle(a.title); setEditTpo(a.tpo); setEditFreq(a.freq);
    setEditEnergy(a.energy); setEditVerdict(a.teamAuto); setEditNote(a.discussionNote);
  };

  const handleSaveEdit = () => {
    if (!editActivity) return;
    socket.emit('activity:update', {
      sessionId: id, activityId: editActivity.id,
      title: editTitle, tpo: editTpo, freq: editFreq, energy: editEnergy, token,
    });
    if (editVerdict !== editActivity.teamAuto)
      socket.emit('activity:classify', { sessionId: id, activityId: editActivity.id, verdict: editVerdict, token });
    if (editNote !== editActivity.discussionNote)
      socket.emit('activity:note', { sessionId: id, activityId: editActivity.id, note: editNote, token });
    setEditActivity(null);
  };

  const openExport = async () => {
    const res  = await fetch(`/api/sessions/${id}/export`);
    const data = await res.json();
    setExportMd(data.markdown ?? '');
    setShowExport(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportMd);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ── Merge helpers ─────────────────────────────────────────────────────────

  /** Client-side Jaccard title similarity (mirrors server formula). */
  const clientTitleSimilarity = (a: string, b: string): number => {
    const tokenize = (s: string) =>
      new Set(
        s.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 2)
      );
    const setA = tokenize(a);
    const setB = tokenize(b);
    if (setA.size === 0 && setB.size === 0) return 0;
    const intersection = new Set([...setA].filter(w => setB.has(w)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  };

  const clientCombinedSimilarity = (src: Activity, cand: Activity): number => {
    const sem = clientTitleSimilarity(src.title, cand.title);
    const sameFreq = src.freq === cand.freq ? 1 : 0;
    const sameTpo  = src.tpo  === cand.tpo  ? 1 : 0;
    return 0.85 * sem + 0.10 * sameFreq + 0.05 * sameTpo;
  };

  const openMerge = (a: Activity) => {
    setMergeSource(a);
    setMergeSelected(new Set([a.id]));
    setMergeTitle(a.title);
    setMergeTpo(a.tpo);
    setMergeFreq(a.freq);
    setMergeEnergy(a.energy);
    setMergeSearch('');
  };

  const handleMerge = () => {
    if (!mergeSource || mergeSelected.size < 2) return;
    socket.emit('activity:merge', {
      sessionId: id,
      sourceIds: Array.from(mergeSelected),
      title: mergeTitle,
      tpo: mergeTpo,
      freq: mergeFreq,
      energy: mergeEnergy,
      token,
    });
    setMergeSource(null);
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const activeActivities = activities.filter(a => !a.isMergedSource);

  const flagged    = activeActivities.filter(a => a.flagged);
  const classified = activeActivities.filter(a => a.teamAuto !== 'unclassified');
  const pending    = activeActivities.filter(a => a.teamAuto === 'unclassified');

  const discusActivity = pending[discussIdx] ?? pending[0] ?? null;
  const perPerson = new Map<string, number>();
  activeActivities.forEach(a => perPerson.set(a.participantName, (perPerson.get(a.participantName) ?? 0) + 1));

  // ── Render ────────────────────────────────────────────────────────────────

  if (!session) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--paper)' }}>
      <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Loading…</span>
    </div>
  );

  return (
    <div className="wa-layout">
      {/* ── Topbar ── */}
      <div className="wa-topbar">
        <a href="/" className="wa-brand"><span className="wa-brandmark">W</span><span>Work Audit</span></a>
        <div style={{ height: 20, width: 1, background: 'var(--rule)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{session.name}</div>
          <div className="wa-eyebrow" style={{ fontSize: 10 }}>
            FACILITATOR · {activities.length} activities
            {classified.length > 0 ? ` · ${classified.length}/${activities.length} classified` : ''}
            {flagged.length > 0 ? ` · ${flagged.length} flagged` : ''}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {session.status === 'active' && timer && (
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
              <button className="wa-btn is-ghost" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => handleExtend(2)}>+2 min</button>
              <button className="wa-btn is-ghost" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => handleExtend(5)}>+5 min</button>
            </>
          )}
          {session.status === 'lobby' && (
            <button className="wa-btn is-rust" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleStart}>
              Start submissions →
            </button>
          )}
          {session.status === 'active' && (
            <button className="wa-btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={handleClose}>
              End → start discussion
            </button>
          )}
          <div style={{ width: 1, height: 16, background: 'var(--rule)' }} />
          <div className="wa-tabs">
            <button className={view === 'live'    ? 'is-on' : ''} onClick={() => setView('live')}>Live</button>
            <button className={view === 'matrix'  ? 'is-on' : ''} onClick={() => setView('matrix')}>⊞ Matrix</button>
            <button className={view === 'grouped' ? 'is-on' : ''} onClick={() => setView('grouped')}>≡ Grouped</button>
            <button className={view === 'discuss' ? 'is-on' : ''} onClick={() => setView('discuss')}>★ Discuss</button>
          </div>
          <button
            className="wa-btn is-ghost"
            style={{ padding: '6px 12px', fontSize: 12, position: 'relative' }}
            onClick={openExport}
          >
            Export ↗
            {flagged.length > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                width: 16, height: 16, borderRadius: '50%',
                background: 'var(--rust)', color: '#fff',
                fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--cream)',
              }}>
                {flagged.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Views ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {view === 'live'    && <LiveView activities={activeActivities} participants={participants} perPerson={perPerson} onEdit={openEdit} onRemove={handleRemove} onMerge={openMerge} allActivities={activities} />}
        {view === 'matrix'  && <MatrixView activities={activeActivities} selected={selectedActivity} onSelect={setSelectedActivity} onEdit={openEdit} onRemove={handleRemove} onFlag={handleFlag} onClassify={handleClassify} onMerge={openMerge} />}
        {view === 'grouped' && <GroupedView activities={activeActivities} onEdit={openEdit} onRemove={handleRemove} onMerge={openMerge} />}
        {view === 'discuss' && (
          <DiscussView
            activities={activeActivities}
            classified={classified}
            pending={pending}
            flagged={flagged}
            discusActivity={discusActivity}
            discussIdx={discussIdx}
            onSelectIdx={setDiscussIdx}
            onClassify={handleClassify}
            onFlag={handleFlag}
            onNote={handleNote}
            onEdit={openEdit}
            onRemove={handleRemove}
            onMerge={openMerge}
          />
        )}
      </div>

      {/* ── Edit modal ── */}
      {editActivity && (
        <EditModal
          activity={editActivity}
          title={editTitle} tpo={editTpo} freq={editFreq} energy={editEnergy}
          verdict={editVerdict} note={editNote}
          onTitle={setEditTitle} onTpo={setEditTpo} onFreq={setEditFreq}
          onEnergy={setEditEnergy} onVerdict={setEditVerdict} onNote={setEditNote}
          onSave={handleSaveEdit}
          onRemove={() => { handleRemove(editActivity.id); setEditActivity(null); }}
          onClose={() => setEditActivity(null)}
          facilitatorName={session.facilitatorName}
        />
      )}

      {/* ── Export modal ── */}
      {showExport && (
        <ExportModal
          markdown={exportMd}
          sessionName={session.name}
          onCopy={handleCopy}
          copied={copied}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* ── Merge modal ── */}
      {mergeSource && (
        <MergeModal
          source={mergeSource}
          candidates={activities
            .filter(a => !a.isMergedSource && a.id !== mergeSource.id)
            .map(a => ({
              ...a,
              similarity: clientCombinedSimilarity(mergeSource, a),
              sameFreq: a.freq === mergeSource.freq,
              sameTpo: a.tpo === mergeSource.tpo,
            }))
            .sort((a, b) => b.similarity - a.similarity)
          }
          selected={mergeSelected}
          onToggle={(id) => {
            setMergeSelected(prev => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          search={mergeSearch}
          onSearch={setMergeSearch}
          title={mergeTitle}
          tpo={mergeTpo}
          freq={mergeFreq}
          energy={mergeEnergy}
          onTitle={setMergeTitle}
          onTpo={setMergeTpo}
          onFreq={setMergeFreq}
          onEnergy={setMergeEnergy}
          onMerge={handleMerge}
          onClose={() => setMergeSource(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LIVE CARD
// ══════════════════════════════════════════════════════════════════════════════

function LiveCard({ a, onEdit, onRemove, onMerge, allActivities }: {
  a: Activity;
  onEdit: (a: Activity) => void;
  onRemove: (id: string) => void;
  onMerge: (a: Activity) => void;
  allActivities: Activity[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isMerged = !!(a.mergedFromIds && a.mergedFromIds.length > 0);
  const sourcesForCard = isMerged
    ? allActivities.filter(s => a.mergedFromIds!.includes(s.id))
    : [];

  return (
    <div className="wa-activity">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span className="wa-avatar is-sm" style={{ background: a.participantColor, color: '#fff' }}>{a.participantInitials}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{a.participantName}</span>
        {isMerged && (
          <span className="wa-chip is-sage" style={{ fontSize: 10, padding: '1px 6px' }}>⇄ merged</span>
        )}
        <span style={{ marginLeft: 'auto' }}><FacActions size="sm" onEdit={() => onEdit(a)} onRemove={() => onRemove(a.id)} onMerge={() => onMerge(a)} /></span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: 1 }}>{a.title}</span>
        <EffortPill tpo={a.tpo} freq={a.freq} />
      </div>
      <ActivityChipsShort tpo={a.tpo} freq={a.freq} energy={a.energy} />
      {isMerged && sourcesForCard.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)',
              padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {expanded ? '▲' : '▼'} {sourcesForCard.length} source {sourcesForCard.length === 1 ? 'card' : 'cards'}
          </button>
          {expanded && (
            <div style={{ marginTop: 6, display: 'grid', gap: 5 }}>
              {sourcesForCard.map(src => (
                <div key={src.id} style={{
                  padding: '7px 10px', border: '1px solid var(--border-soft)',
                  borderRadius: 4, background: 'var(--paper)', opacity: 0.7,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span className="wa-avatar is-sm" style={{ background: src.participantColor, color: '#fff', width: 18, height: 18, fontSize: 9 }}>{src.participantInitials}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{src.participantName}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{src.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LIVE VIEW
// ══════════════════════════════════════════════════════════════════════════════

function LiveView({ activities, participants, perPerson, onEdit, onRemove, onMerge, allActivities }: {
  activities: Activity[];
  participants: Participant[];
  perPerson: Map<string, number>;
  onEdit: (a: Activity) => void;
  onRemove: (id: string) => void;
  onMerge: (a: Activity) => void;
  allActivities: Activity[];
}) {
  const recent = [...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  // Theme aggregation
  const themeMap = new Map<string, Set<string>>();
  activities.forEach(a => {
    const words = a.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    words.forEach(w => {
      if (!themeMap.has(w)) themeMap.set(w, new Set());
      themeMap.get(w)!.add(a.participantName.split(' ')[0]);
    });
  });
  const themes = Array.from(themeMap.entries())
    .filter(([, s]) => s.size >= 2)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 5);

  const freqDist = { Daily: 0, Weekly: 0, Monthly: 0, Quarterly: 0 };
  activities.forEach(a => {
    if (a.freq === 'daily')     freqDist.Daily++;
    if (a.freq === 'weekly')    freqDist.Weekly++;
    if (a.freq === 'monthly')   freqDist.Monthly++;
    if (a.freq === 'quarterly') freqDist.Quarterly++;
  });
  const maxFreq = Math.max(...Object.values(freqDist), 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 1fr', height: '100%' }}>
      {/* LEFT — per-person counts */}
      <aside style={{ padding: '24px 18px', borderRight: '1px solid var(--rule)', background: 'var(--paper)', overflowY: 'auto' }}>
        <div className="wa-eyebrow" style={{ marginBottom: 14 }}>↳ Submissions per person</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {participants.map(p => {
            const n = perPerson.get(p.name) ?? 0;
            const status = n === 0 ? 'idle' : n < 3 ? 'low' : 'ok';
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 4 }}>
                <span className="wa-avatar is-sm" style={{ background: p.color, color: '#fff' }}>{p.initials}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{n === 0 ? 'not started' : `${n} activities`}</div>
                </div>
                <span className="wa-mono" style={{ fontSize: 16, fontWeight: 600, color: status === 'ok' ? 'var(--sage)' : status === 'low' ? 'var(--amber)' : 'var(--muted-2)' }}>{n}</span>
              </div>
            );
          })}
        </div>
        <hr className="wa-rule" style={{ margin: '18px 0 14px' }} />
        <div className="wa-eyebrow" style={{ marginBottom: 8 }}>↳ Totals</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--muted)' }}>Activities so far</span>
          <span className="wa-mono" style={{ fontWeight: 600 }}>{activities.length}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
          <span style={{ color: 'var(--muted)' }}>Per-engineer avg</span>
          <span className="wa-mono" style={{ fontWeight: 600 }}>
            {participants.length > 0 ? (activities.length / participants.length).toFixed(1) : '—'}
          </span>
        </div>
      </aside>

      {/* CENTER — live stream */}
      <main style={{ padding: '24px 28px', overflowY: 'auto', background: 'var(--cream)', borderRight: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 className="wa-display" style={{ fontSize: 22, margin: 0, fontWeight: 500 }}>Live stream</h3>
          <span className="wa-tick">↳ newest first</span>
        </div>
        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>◌</div>
            Waiting for engineers to submit activities…
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {recent.map(a => (
              <LiveCard key={a.id} a={a} onEdit={onEdit} onRemove={onRemove} onMerge={onMerge} allActivities={allActivities} />
            ))}
          </div>
        )}
      </main>

      {/* RIGHT — themes */}
      <aside style={{ padding: '24px 24px', background: 'var(--paper)', overflowY: 'auto' }}>
        <Eyebrow>↳ Emerging themes</Eyebrow>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 18px', lineHeight: 1.5 }}>
          Patterns by topic — automatability gets decided together in discussion.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 22 }}>
          {themes.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted-2)', fontStyle: 'italic' }}>Themes will emerge as submissions grow.</div>
          ) : (
            themes.map(([word, names], i) => (
              <div key={word} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 4 }}>
                <span className="wa-mono" style={{ fontSize: 16, fontWeight: 600, color: i < 2 ? 'var(--rust)' : 'var(--muted)' }}>{names.size}×</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, textTransform: 'capitalize' }}>{word}</div>
                  <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{Array.from(names).join(' · ')}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <hr className="wa-rule" style={{ margin: '14px 0' }} />
        <Eyebrow>↳ Frequency distribution</Eyebrow>
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {Object.entries(freqDist).map(([label, n]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 70, fontSize: 12 }}>{label}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--paper-deep)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(n / maxFreq) * 100}%`, height: '100%', background: label === 'Daily' ? 'var(--rust)' : label === 'Weekly' ? 'var(--amber)' : 'var(--slate)' }} />
              </div>
              <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)', width: 16, textAlign: 'right' }}>{n}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MATRIX VIEW
// ══════════════════════════════════════════════════════════════════════════════

function MatrixView({ activities, selected, onSelect, onEdit, onRemove, onFlag, onClassify, onMerge }: {
  activities: Activity[];
  selected: Activity | null;
  onSelect: (a: Activity | null) => void;
  onEdit: (a: Activity) => void;
  onRemove: (id: string) => void;
  onFlag: (id: string, flagged: boolean, note?: string) => void;
  onClassify: (id: string, v: AutoVerdict) => void;
  onMerge: (a: Activity) => void;
}) {
  const sel = selected ?? activities[0] ?? null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100%' }}>
      <main style={{ padding: '24px 32px', background: 'var(--cream)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
          <div>
            <Eyebrow>Priority view · energy × effort · color = team verdict</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 22, margin: '6px 0 0', fontWeight: 500 }}>
              Where does the team bleed time on draining work?
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="wa-eyebrow" style={{ marginRight: 4 }}>Filter ·</span>
            <span className="wa-chip">All roles ▾</span>
            <span className="wa-chip">All cadences ▾</span>
          </div>
        </div>

        {/* Matrix plot */}
        <div style={{ flex: 1, position: 'relative', background: '#fff', border: '1px solid var(--rule)', borderRadius: 6, padding: '52px 48px 48px 60px', minHeight: 0 }}>
          <div style={{ position: 'absolute', top: 52, bottom: 48, left: 60, right: 48 }}>
            {/* Quadrant backgrounds */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '50%', background: 'var(--rust-bg)', opacity: 0.45 }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '50%', height: '50%', background: 'var(--sage-bg)', opacity: 0.35 }} />
            </div>
            {/* Cross-hair */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: '1px dashed var(--border-soft)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed var(--border-soft)' }} />
            {/* Quadrant labels */}
            <div style={{ position: 'absolute', top: 10, right: 12, textAlign: 'right' }}>
              <div className="wa-eyebrow" style={{ color: 'var(--rust)', fontWeight: 600 }}>↗ PRIORITY ZONE</div>
              <div style={{ fontSize: 11, color: '#6a2810', maxWidth: 180, marginTop: 3, lineHeight: 1.4 }}>Drains <em>and</em> eats their week. Fix or remove.</div>
            </div>
            <div style={{ position: 'absolute', top: 10, left: 12 }}>
              <div className="wa-eyebrow">↖ TOLERABLE</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 160, marginTop: 3, lineHeight: 1.4 }}>Annoying but small — accept or quick-win.</div>
            </div>
            <div style={{ position: 'absolute', bottom: 10, right: 12, textAlign: 'right' }}>
              <div className="wa-eyebrow">↘ STRATEGIC</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 160, marginTop: 3, lineHeight: 1.4 }}>Big work the team enjoys — celebrate.</div>
            </div>
            <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
              <div className="wa-eyebrow" style={{ color: '#3b4a2b' }}>↙ HEALTHY DEFAULT</div>
              <div style={{ fontSize: 11, color: '#3b4a2b', maxWidth: 160, marginTop: 3, lineHeight: 1.4 }}>Energizing, low-cost work. Leave alone.</div>
            </div>
            {/* Dots — clustered so overlapping activities spread into a ring */}
            {(() => {
              const positions = clusterMatrixPositions(activities);
              return activities.map(a => {
                const pos = positions.get(a.id) ?? matrixCoords(a.tpo, a.freq, a.energy);
                return (
                  <MatrixDot
                    key={a.id}
                    initials={a.participantInitials}
                    color={a.participantColor}
                    teamAuto={a.teamAuto}
                    flagged={a.flagged}
                    title={`${a.title} · ${calcEffort(a.tpo, a.freq).display} · ${a.energy}`}
                    x={pos.x} y={pos.y}
                    size={a.flagged ? 36 : 30}
                    active={sel?.id === a.id}
                    onClick={() => onSelect(a)}
                  />
                );
              });
            })()}
          </div>
          {/* X-axis label — centred in the 48px bottom padding strip */}
          <div style={{
            position: 'absolute', bottom: 0, height: 48,
            left: 60, right: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
              ← LOW EFFORT &nbsp;·&nbsp; EFFORT (~h/wk) &nbsp;·&nbsp; HIGH EFFORT →
            </span>
          </div>
          {/* Y-axis label — centred in the 60px left padding strip, rotated */}
          <div style={{
            position: 'absolute', left: 0, width: 60,
            top: 52, bottom: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="wa-mono" style={{
              fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em',
              whiteSpace: 'nowrap', transform: 'rotate(-90deg)',
            }}>
              ← ENERGIZING &nbsp;·&nbsp; ENERGY &nbsp;·&nbsp; DRAINING →
            </span>
          </div>
          {/* Legend */}
          <div style={{ position: 'absolute', top: 12, left: 16, display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--muted)' }}>
            <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', letterSpacing: '0.06em' }}>DOT =</span>
            <LegendDot color="var(--rust)"  label="Automatable" />
            <LegendDot color="var(--amber)" label="Maybe" />
            <LegendDot color="#8a8170"      label="Manual" />
            <LegendDot color="#fff" dashed  label="Unclassified" />
            <span style={{ marginLeft: 8 }}>★ flagged</span>
          </div>
        </div>
      </main>

      {/* Right panel */}
      <aside style={{ padding: '24px 22px', borderLeft: '1px solid var(--rule)', background: 'var(--paper)', overflowY: 'auto' }}>
        {sel ? (
          <>
            <Eyebrow>Selected · {activities.findIndex(a => a.id === sel.id) + 1} of {activities.length}</Eyebrow>
            <h3 className="wa-display" style={{ fontSize: 19, margin: '8px 0 14px', fontWeight: 500, lineHeight: 1.25 }}>{sel.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span className="wa-avatar" style={{ background: sel.participantColor, color: '#fff' }}>{sel.participantInitials}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{sel.participantName}</div>
                <div className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>IC</div>
              </div>
              <EffortPill tpo={sel.tpo} freq={sel.freq} size="lg" />
            </div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
              <DetailRow k="Time / occ" v={TPO_LABEL[sel.tpo]} tone={TPO_TONE[sel.tpo]} />
              <DetailRow k="Cadence"    v={FREQ_LABEL[sel.freq]} tone={FREQ_TONE[sel.freq]} />
              <DetailRow k="Energy"     v={`${sel.energy.charAt(0).toUpperCase()}${sel.energy.slice(1)}`} tone={ENERGY_TONE[sel.energy]} />
              <DetailRow k="Verdict"    v={AUTO_LABEL[sel.teamAuto]} tone={AUTO_TONE[sel.teamAuto]} />
            </div>
            <hr className="wa-rule" />
            <div style={{ marginTop: 14, marginBottom: 8 }}>
              <Eyebrow>Position</Eyebrow>
            </div>
            {(() => {
              const { x, y } = matrixCoords(sel.tpo, sel.freq, sel.energy);
              const zone = y < 50 && x > 50 ? '↗ PRIORITY ZONE'
                : y < 50 ? '↖ TOLERABLE'
                : x > 50 ? '↘ STRATEGIC'
                : '↙ HEALTHY DEFAULT';
              const zoneColor = zone.includes('PRIORITY') ? 'is-rust' : zone.includes('STRATEGIC') ? '' : 'is-sage';
              return <div className={`wa-chip ${zoneColor}`} style={{ fontWeight: 600, padding: '6px 10px' }}>{zone}</div>;
            })()}
            <hr className="wa-rule" style={{ margin: '14px 0' }} />

            {/* Classify directly from matrix */}
            <div className="wa-eyebrow" style={{ marginBottom: 8 }}>↳ Team verdict · automatable?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 14 }}>
              <ClassifyBtn label="Yes"   sub="clearly" tone="rust"  active={sel.teamAuto === 'yes'}   onClick={() => onClassify(sel.id, 'yes')} />
              <ClassifyBtn label="Maybe" sub="partial" tone="amber" active={sel.teamAuto === 'maybe'} onClick={() => onClassify(sel.id, 'maybe')} />
              <ClassifyBtn label="No"    sub="human"                active={sel.teamAuto === 'no'}    onClick={() => onClassify(sel.id, 'no')} />
            </div>

            <button
              className={`wa-btn ${sel.flagged ? 'is-ghost' : 'is-rust'}`}
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => onFlag(sel.id, !sel.flagged)}
            >
              {sel.flagged ? '✕ Unflag' : '★ Flag for next quarter'}
            </button>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center' }}>
              <FacActions onEdit={() => onEdit(sel)} onRemove={() => onRemove(sel.id)} onMerge={() => onMerge(sel)} />
            </div>
            {sel.discussionNote && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--paper-deep)', borderRadius: 4, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>↳ TEAM DISCUSSION NOTE</span>
                "{sel.discussionNote}"
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: 13, paddingTop: 16 }}>Click a dot to inspect an activity.</div>
        )}
      </aside>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GROUPED VIEW
// ══════════════════════════════════════════════════════════════════════════════

function GroupedView({ activities, onEdit, onRemove, onMerge }: {
  activities: Activity[];
  onEdit: (a: Activity) => void;
  onRemove: (id: string) => void;
  onMerge: (a: Activity) => void;
}) {
  const [sortKey, setSortKey] = useState<'effort' | 'energy' | 'person'>('effort');
  const [showUnclassified, setShowUnclassified] = useState(true);

  // Perceived cost = clock hours × energy multiplier (same formula as DiscussView).
  const ENERGY_COST: Record<string, number> = { draining: 2.0, tedious: 1.5, fine: 1.0, energizing: 0.5 };
  const perceivedCost = (a: Activity) => calcEffort(a.tpo, a.freq).hrs * (ENERGY_COST[a.energy] ?? 1.0);

  const groups = {
    yes:   { title: 'Automatable', hint: 'Team agreed: yes · → Build the automation', tone: 'rust',  items: activities.filter(a => a.teamAuto === 'yes') },
    maybe: { title: 'Maybe',       hint: 'Team agreed: maybe · → Research spike needed', tone: 'amber', items: activities.filter(a => a.teamAuto === 'maybe') },
    no:    { title: 'Manual',      hint: 'Team agreed: no · acknowledged, no action this quarter', tone: 'slate', items: activities.filter(a => a.teamAuto === 'no') },
  };
  const unclassified = activities.filter(a => a.teamAuto === 'unclassified');

  const sortFn = (a: Activity, b: Activity) =>
    sortKey === 'effort' ? perceivedCost(b) - perceivedCost(a)
    : sortKey === 'energy' ? (['draining','tedious','fine','energizing'].indexOf(a.energy) - ['draining','tedious','fine','energizing'].indexOf(b.energy))
    : a.participantName.localeCompare(b.participantName);

  Object.values(groups).forEach(g => g.items.sort(sortFn));

  return (
    <div style={{ padding: '24px 32px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <Eyebrow>Grouped by team verdict on automatability</Eyebrow>
          <h2 className="wa-display" style={{ fontSize: 22, margin: '4px 0 0', fontWeight: 500 }}>
            Automation backlog · act on these in order.
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="wa-eyebrow" style={{ marginRight: 6 }}>Sort ·</span>
          <div className="wa-tabs">
            {(['effort', 'energy', 'person'] as const).map(k => (
              <button key={k} className={sortKey === k ? 'is-on' : ''} onClick={() => setSortKey(k)} style={{ textTransform: 'capitalize' }}>{k}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Three classified columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, flex: unclassified.length > 0 ? '0 0 auto' : 1, overflow: unclassified.length > 0 ? 'visible' : 'hidden', maxHeight: unclassified.length > 0 ? '55%' : undefined }}>
        {Object.entries(groups).map(([key, g]) => {
          const isManual = key === 'no';
          return (
            <div key={key} style={{
              background: key === 'yes' ? 'var(--rust-bg)' : key === 'maybe' ? 'var(--amber-bg)' : 'var(--paper)',
              border: `1px solid ${isManual ? 'var(--rule)' : 'var(--border-soft)'}`,
              borderRadius: 6, padding: 16,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              opacity: isManual ? 0.72 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="wa-mono" style={{ fontSize: 20, fontWeight: 600, color: isManual ? 'var(--muted-2)' : `var(--${g.tone})` }}>{g.items.length}</span>
                <h3 className="wa-display" style={{ fontSize: 18, margin: 0, fontWeight: 500, color: isManual ? 'var(--muted)' : undefined }}>
                  {isManual ? 'Manual · no action needed' : g.title}
                </h3>
              </div>
              <p style={{ fontSize: 11.5, color: isManual ? 'var(--muted-2)' : 'var(--ink-2)', marginBottom: 14 }}>{g.hint}</p>
              <div style={{ display: 'grid', gap: 6, overflowY: 'auto', paddingRight: 4 }}>
                {g.items.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted-2)', fontStyle: 'italic' }}>None yet.</div>}
                {g.items.map((a, idx) => (
                  <GroupedCard key={a.id} a={a} rank={isManual ? undefined : idx + 1} onEdit={onEdit} onRemove={onRemove} onMerge={onMerge} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unclassified section — shown until classification begins */}
      {unclassified.length > 0 && (
        <div style={{ marginTop: 14, flexShrink: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={() => setShowUnclassified(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: 'var(--paper-deep)', border: '1px dashed var(--rule)', borderRadius: 6,
              cursor: 'pointer', textAlign: 'left', marginBottom: showUnclassified ? 8 : 0,
            }}
          >
            <span className="wa-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{unclassified.length}</span>
            <span className="wa-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>Not yet classified</span>
            <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', marginLeft: 8 }}>
              Classify these during discussion
            </span>
            <span className="wa-mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-2)' }}>
              {showUnclassified ? '▲ hide' : '▼ show'}
            </span>
          </button>
          {showUnclassified && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, overflowY: 'auto', padding: '4px 2px' }}>
              {unclassified.sort(sortFn).map(a => (
                <div key={a.id} className="wa-activity" style={{ padding: '9px 11px', width: 'calc(33% - 6px)', minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span className="wa-avatar is-sm" style={{ background: a.participantColor, color: '#fff' }}>{a.participantInitials}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{a.participantName.split(' ')[0]}</span>
                    <EffortPill tpo={a.tpo} freq={a.freq} size="sm" />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.3, marginBottom: 5 }}>{a.title}</div>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`wa-chip ${ENERGY_TONE[a.energy]}`} style={{ padding: '2px 5px', fontSize: 10 }}>{ENERGY_SHORT[a.energy]}</span>
                    <span style={{ marginLeft: 'auto' }}>
                      <FacActions size="sm" onEdit={() => onEdit(a)} onRemove={() => onRemove(a.id)} onMerge={() => onMerge(a)} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupedCard({ a, rank, onEdit, onRemove, onMerge }: {
  a: Activity;
  rank?: number;
  onEdit: (a: Activity) => void;
  onRemove: (id: string) => void;
  onMerge: (a: Activity) => void;
}) {
  return (
    <div className={`wa-activity${a.flagged ? ' wa-flagged' : ''}`} style={{ padding: '10px 12px', position: 'relative' }}>
      {rank !== undefined && (
        <span className="wa-mono" style={{
          position: 'absolute', top: 8, left: 10,
          fontSize: 9, fontWeight: 700, color: 'var(--muted-2)',
          letterSpacing: '0.04em', lineHeight: 1,
        }}>
          {String(rank).padStart(2, '0')}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingLeft: rank !== undefined ? 18 : 0 }}>
        <span className="wa-avatar is-sm" style={{ background: a.participantColor, color: '#fff' }}>{a.participantInitials}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{a.participantName.split(' ')[0]}</span>
        <EffortPill tpo={a.tpo} freq={a.freq} size="sm" />
        {a.mergedFromIds && a.mergedFromIds.length > 0 && (
          <span className="wa-chip is-sage" style={{ fontSize: 9, padding: '1px 5px' }}>⇄ merged</span>
        )}
        {a.flagged ? <span style={{ color: 'var(--flag)', fontSize: 12, marginLeft: 'auto' }}>★</span> : null}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>{a.title}</div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={`wa-chip ${TPO_TONE[a.tpo]}`} style={{ padding: '2px 5px', fontSize: 10 }}>{TPO_SHORT[a.tpo]}</span>
        <span className={`wa-chip ${FREQ_TONE[a.freq]}`} style={{ padding: '2px 5px', fontSize: 10 }}>{FREQ_SHORT[a.freq]}</span>
        <span className={`wa-chip ${ENERGY_TONE[a.energy]}`} style={{ padding: '2px 5px', fontSize: 10 }}>{ENERGY_SHORT[a.energy]}</span>
        <span style={{ marginLeft: 'auto' }}>
          <FacActions size="sm" onEdit={() => onEdit(a)} onRemove={() => onRemove(a.id)} onMerge={() => onMerge(a)} />
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DISCUSS VIEW
// ══════════════════════════════════════════════════════════════════════════════

function DiscussView({
  activities, classified, pending, flagged,
  discusActivity, discussIdx, onSelectIdx,
  onClassify, onFlag, onNote, onEdit, onRemove, onMerge,
}: {
  activities: Activity[];
  classified: Activity[];
  pending: Activity[];
  flagged: Activity[];
  discusActivity: Activity | null;
  discussIdx: number;
  onSelectIdx: (i: number) => void;
  onClassify: (id: string, v: AutoVerdict) => void;
  onFlag: (id: string, flagged: boolean, note?: string) => void;
  onNote: (id: string, note: string) => void;
  onEdit: (a: Activity) => void;
  onRemove: (id: string) => void;
  onMerge: (a: Activity) => void;
}) {
  const [localNote, setLocalNote] = useState('');
  const [skippedIds, setSkippedIds] = useState<string[]>([]);

  // Perceived cost = clock hours × energy multiplier.
  // Draining work costs twice what it looks like; energizing work costs half.
  const ENERGY_COST: Record<Energy, number> = { draining: 2.0, tedious: 1.5, fine: 1.0, energizing: 0.5 };
  const priorityScore = (a: Activity) =>
    calcEffort(a.tpo, a.freq).hrs * ENERGY_COST[a.energy];

  const sortedPending = [...pending].sort((a, b) => priorityScore(b) - priorityScore(a));

  // Reorder: non-skipped (priority-sorted) first, skipped at the end
  const orderedPending = [
    ...sortedPending.filter(a => !skippedIds.includes(a.id)),
    ...sortedPending.filter(a =>  skippedIds.includes(a.id)),
  ];
  const foc = orderedPending[discussIdx] ?? orderedPending[0] ?? null;

  useEffect(() => { setLocalNote(foc?.discussionNote ?? ''); }, [foc?.id, foc?.discussionNote]);

  const handleSkip = () => {
    if (!foc) return;
    setSkippedIds(prev => [...prev.filter(id => id !== foc.id), foc.id]);
    // Stay at same index — it now points to the next non-skipped item
    // If we're at the end, clamp
    onSelectIdx(Math.min(discussIdx, orderedPending.length - 2));
  };

  const skippedCount = skippedIds.filter(id => pending.some(a => a.id === id)).length;

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'k' || e.key === 'ArrowRight') {
        onSelectIdx(Math.min(orderedPending.length - 1, discussIdx + 1));
      } else if (e.key === 'j' || e.key === 'ArrowLeft') {
        onSelectIdx(Math.max(0, discussIdx - 1));
      } else if (e.key === '1' && foc) {
        onClassify(foc.id, 'yes');
      } else if (e.key === '2' && foc) {
        onClassify(foc.id, 'maybe');
      } else if (e.key === '3' && foc) {
        onClassify(foc.id, 'no');
      } else if (e.key === 'f' && foc) {
        onFlag(foc.id, !foc.flagged);
      } else if (e.key === 's' && foc) {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [foc, discussIdx, orderedPending.length, onSelectIdx, onClassify, onFlag]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100%' }}>
      <main style={{ padding: '22px 28px', background: 'var(--cream)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <Eyebrow color="var(--rust)">Discussion · tagging automatability + flagging priorities</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 20, margin: '4px 0 0', fontWeight: 500 }}>
              Walk each activity. Decide automatable together.
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="wa-tick">↳ {classified.length} / {activities.length} classified</span>
            <div style={{ width: 120, height: 6, background: 'var(--paper-deep)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${activities.length > 0 ? (classified.length / activities.length) * 100 : 0}%`, height: '100%', background: 'var(--ink)' }} />
            </div>
          </div>
        </div>

        {/* Mini matrix */}
        <div style={{ flex: 1, position: 'relative', background: '#fff', border: '1px solid var(--rule)', borderRadius: 6, padding: '36px 32px 32px 44px', marginBottom: 12, minHeight: 0 }}>
          <div style={{ position: 'absolute', top: 36, bottom: 32, left: 44, right: 32 }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '50%', background: 'var(--rust-bg)', opacity: 0.45 }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '50%', height: '50%', background: 'var(--sage-bg)', opacity: 0.3 }} />
            </div>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: '1px dashed var(--border-soft)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed var(--border-soft)' }} />
            <span className="wa-quad-label" style={{ top: 8, right: 10, color: 'var(--rust)', fontWeight: 600 }}>↗ PRIORITY · {flagged.length} flagged</span>
            <span className="wa-quad-label" style={{ top: 8, left: 10 }}>↖ Tolerable</span>
            <span className="wa-quad-label" style={{ bottom: 8, right: 10 }}>↘ Strategic</span>
            <span className="wa-quad-label" style={{ bottom: 8, left: 10, color: '#3b4a2b' }}>↙ Healthy</span>
            {(() => {
              const allForCluster = [...classified, ...pending];
              const positions = clusterMatrixPositions(allForCluster);
              return (
                <>
                  {classified.map(a => {
                    const pos = positions.get(a.id) ?? matrixCoords(a.tpo, a.freq, a.energy);
                    return (
                      <MatrixDot
                        key={a.id}
                        initials={a.participantInitials}
                        color={a.participantColor}
                        teamAuto={a.teamAuto}
                        flagged={a.flagged}
                        title={a.title}
                        x={pos.x} y={pos.y}
                        size={a.flagged ? 32 : 26}
                      />
                    );
                  })}
                  {pending.map(a => {
                    const pos = positions.get(a.id) ?? matrixCoords(a.tpo, a.freq, a.energy);
                    const isFoc = foc?.id === a.id;
                    return (
                      <MatrixDot
                        key={a.id}
                        initials={a.participantInitials}
                        color={a.participantColor}
                        teamAuto="unclassified"
                        title={a.title}
                        x={pos.x} y={pos.y}
                        size={isFoc ? 34 : 22}
                        active={isFoc}
                      />
                    );
                  })}
                </>
              );
            })()}
          </div>
          {/* X-axis label */}
          <div style={{ position: 'absolute', bottom: 0, height: 32, left: 44, right: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="wa-mono" style={{ fontSize: 9, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>
              ← LOW EFFORT · h/wk · HIGH EFFORT →
            </span>
          </div>
          {/* Y-axis label */}
          <div style={{ position: 'absolute', left: 0, width: 44, top: 36, bottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="wa-mono" style={{ fontSize: 9, color: 'var(--muted-2)', whiteSpace: 'nowrap', transform: 'rotate(-90deg)' }}>
              ← ENERGIZING · DRAINING →
            </span>
          </div>
        </div>

        {/* Pending tray */}
        {pending.length > 0 && (
          <div style={{ background: 'var(--paper-deep)', border: '1px dashed var(--rust)', borderRadius: 6, padding: '10px 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="wa-eyebrow" style={{ color: 'var(--rust)' }}>↳ Needs classification ({pending.length})</div>
              <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                {skippedCount > 0 ? `${skippedCount} skipped · deferred to end` : 'not yet placed'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {orderedPending.map((a, i) => {
                const active = i === discussIdx;
                const isSkipped = skippedIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => onSelectIdx(i)}
                    style={{
                      padding: '6px 9px',
                      background: active ? 'var(--ink)' : '#fff',
                      color: active ? 'var(--cream)' : isSkipped ? 'var(--muted)' : 'var(--ink-2)',
                      border: '1px solid ' + (active ? 'var(--ink)' : isSkipped ? 'var(--border-soft)' : 'var(--rule)'),
                      borderRadius: 14, fontSize: 11, opacity: isSkipped && !active ? 0.6 : 1,
                      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    }}
                  >
                    <span className="wa-avatar is-sm" style={{ background: a.participantColor, color: '#fff', width: 14, height: 14, fontSize: 8 }}>{a.participantInitials}</span>
                    <span style={{ whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Right rail */}
      <aside style={{ borderLeft: '1px solid var(--rule)', background: 'var(--paper)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {foc ? (
          <>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ marginBottom: 4 }}>
                <Eyebrow color="var(--rust)">↳ Now reviewing · {discussIdx + 1} / {pending.length + classified.length}</Eyebrow>
              </div>
              <h3 className="wa-display" style={{ fontSize: 18, margin: '6px 0 10px', fontWeight: 500, lineHeight: 1.25 }}>{foc.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="wa-avatar is-sm" style={{ background: foc.participantColor, color: '#fff' }}>{foc.participantInitials}</span>
                <span style={{ fontSize: 12 }}>{foc.participantName}</span>
                <EffortPill tpo={foc.tpo} freq={foc.freq} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                <span className={`wa-chip ${TPO_TONE[foc.tpo]}`}>{TPO_SHORT[foc.tpo]}</span>
                <span className={`wa-chip ${FREQ_TONE[foc.freq]}`}>{FREQ_SHORT[foc.freq]}</span>
                <span className={`wa-chip ${ENERGY_TONE[foc.energy]}`}>{ENERGY_SHORT[foc.energy]}</span>
                <span style={{ marginLeft: 'auto' }}>
                  <FacActions size="sm" onEdit={() => onEdit(foc)} onRemove={() => onRemove(foc.id)} onMerge={() => onMerge(foc)} />
                </span>
              </div>
            </div>

            {/* Classify */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-soft)' }}>
              <div className="wa-eyebrow" style={{ marginBottom: 10 }}>↳ Team verdict · automatable?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                <ClassifyBtn label="Yes"   sub="clearly" tone="rust"  active={foc.teamAuto === 'yes'}   onClick={() => onClassify(foc.id, 'yes')} />
                <ClassifyBtn label="Maybe" sub="partial" tone="amber" active={foc.teamAuto === 'maybe'} onClick={() => onClassify(foc.id, 'maybe')} />
                <ClassifyBtn label="No"    sub="human judgement"    active={foc.teamAuto === 'no'}    onClick={() => onClassify(foc.id, 'no')} />
              </div>
              <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>↳ shortcut · 1 / 2 / 3</div>
            </div>

            {/* Flag */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-soft)' }}>
              <div className="wa-eyebrow" style={{ marginBottom: 8 }}>↳ Flag this for next quarter?</div>
              <button
                className={`wa-btn ${foc.flagged ? 'is-ghost' : 'is-rust'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onFlag(foc.id, !foc.flagged)}
              >
                {foc.flagged ? '✕ Unflag' : '★ Flag this activity'}
              </button>
              <textarea
                className="wa-input"
                style={{ marginTop: 8, fontSize: 12, padding: '8px 10px', background: 'var(--paper)', minHeight: 52, resize: 'vertical', fontFamily: 'var(--font-body)' }}
                placeholder="Optional discussion note · who'll own it…"
                value={localNote}
                onChange={e => setLocalNote(e.target.value)}
                onBlur={() => { if (localNote !== foc.discussionNote) onNote(foc.id, localNote); }}
              />
            </div>

            {/* Similar activities panel */}
            {(() => {
              const tokenize = (s: string) =>
                new Set(
                  s.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .split(/\s+/)
                    .filter(w => w.length > 2)
                );
              const jaccardSim = (a: string, b: string): number => {
                const sa = tokenize(a), sb = tokenize(b);
                if (sa.size === 0 && sb.size === 0) return 0;
                const inter = new Set([...sa].filter(w => sb.has(w)));
                const uni   = new Set([...sa, ...sb]);
                return inter.size / uni.size;
              };
              const similars = activities
                .filter(a => a.id !== foc.id)
                .map(a => {
                  const sem = jaccardSim(foc.title, a.title);
                  const score = 0.85 * sem + 0.10 * (foc.freq === a.freq ? 1 : 0) + 0.05 * (foc.tpo === a.tpo ? 1 : 0);
                  return { a, score };
                })
                .filter(({ score }) => score > 0.15)
                .sort((x, y) => y.score - x.score)
                .slice(0, 5);
              if (similars.length === 0) return null;
              return (
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Eyebrow>⇄ Similar activities</Eyebrow>
                    <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{similars.length}</span>
                  </div>
                  <div style={{ display: 'grid', gap: 5 }}>
                    {similars.map(({ a, score }) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 4 }}>
                        <span className="wa-avatar is-sm" style={{ background: a.participantColor, color: '#fff', width: 18, height: 18, fontSize: 9 }}>{a.participantInitials}</span>
                        <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.3 }}>{a.title}</span>
                        <button
                          onClick={() => onMerge(foc)}
                          style={{
                            background: 'transparent', border: '1px solid var(--border-soft)',
                            borderRadius: 3, cursor: 'pointer', fontSize: 10,
                            color: 'var(--muted)', fontFamily: 'var(--font-mono)',
                            padding: '2px 6px', whiteSpace: 'nowrap',
                          }}
                        >⇄ merge</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Flagged list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <Eyebrow>★ Flagged so far</Eyebrow>
                <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{flagged.length}</span>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {flagged.map((a, i) => (
                  <div key={a.id} style={{ background: '#fff', borderLeft: '3px solid var(--rust)', border: '1px solid var(--rust-bg)', borderRadius: 4, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="wa-avatar is-sm" style={{ background: a.participantColor, color: '#fff' }}>{a.participantInitials}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{a.participantName.split(' ')[0]}</span>
                      <span style={{ color: 'var(--flag)', marginLeft: 'auto', fontSize: 11 }}>★</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{a.title}</div>
                  </div>
                ))}
                {flagged.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted-2)', fontStyle: 'italic' }}>No activities flagged yet.</div>}
              </div>
            </div>

            {/* Nav buttons */}
            <div style={{ padding: '8px 14px 14px', borderTop: '1px solid var(--border-soft)' }}>
              <div className="wa-mono" style={{ fontSize: 9, color: 'var(--muted-2)', letterSpacing: '0.04em', textAlign: 'center', marginBottom: 8 }}>
                ← j &nbsp; k → &nbsp;&nbsp; 1/2/3 classify &nbsp;&nbsp; f flag &nbsp;&nbsp; s skip
              </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="wa-btn is-ghost" style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: 12 }}
                onClick={() => onSelectIdx(Math.max(0, discussIdx - 1))}>← Prev</button>
              <button
                className="wa-btn is-ghost"
                style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: 12, color: 'var(--muted)' }}
                onClick={handleSkip}
                disabled={!foc}
                title="Defer to end of queue — come back to it later (s)"
              >
                Skip ↷
              </button>
              <button className="wa-btn" style={{ flex: 2, justifyContent: 'center', padding: '8px', fontSize: 12 }}
                onClick={() => onSelectIdx(Math.min(orderedPending.length - 1, discussIdx + 1))}>Next →</button>
            </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
            {pending.length === 0 && classified.length > 0 ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>All activities classified!</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Export the results when you&apos;re done discussing.</div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Select an activity from the tray to begin.</div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EDIT MODAL
// ══════════════════════════════════════════════════════════════════════════════

function EditModal({
  activity, title, tpo, freq, energy, verdict, note,
  onTitle, onTpo, onFreq, onEnergy, onVerdict, onNote,
  onSave, onRemove, onClose, facilitatorName,
}: {
  activity: Activity;
  title: string; tpo: TimePerOccurrence; freq: Frequency; energy: Energy;
  verdict: AutoVerdict; note: string;
  onTitle: (v: string) => void;
  onTpo: (v: TimePerOccurrence) => void;
  onFreq: (v: Frequency) => void;
  onEnergy: (v: Energy) => void;
  onVerdict: (v: AutoVerdict) => void;
  onNote: (v: string) => void;
  onSave: () => void; onRemove: () => void; onClose: () => void;
  facilitatorName: string;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,26,22,0.45)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 760, maxHeight: '92dvh', background: 'var(--cream)',
        borderRadius: 8, boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
        border: '1px solid var(--rule)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <Eyebrow color="var(--rust)">↳ Facilitator action · edit activity</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 20, margin: '4px 0 0', fontWeight: 500 }}>
              Editing on behalf of {activity.participantName.split(' ')[0]}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, fontSize: 20, color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Original card preview */}
        <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--border-soft)', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="wa-avatar is-sm" style={{ background: activity.participantColor, color: '#fff' }}>{activity.participantInitials}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', letterSpacing: '0.06em' }}>↳ ORIGINAL · {activity.participantName}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{activity.title}"</div>
          </div>
          <EffortPill tpo={activity.tpo} freq={activity.freq} size="sm" />
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          <label className="wa-label">Activity</label>
          <input className="wa-input" style={{ fontSize: 15, padding: '11px 14px', marginBottom: 6 }} value={title} onChange={e => onTitle(e.target.value)} />
          <div className="wa-mono" style={{ fontSize: 10.5, color: 'var(--muted-2)', marginBottom: 18, letterSpacing: '0.04em' }}>
            ↳ changes are visible to the original author with an "edited by {facilitatorName}" footnote
          </div>

          {/* Three questions */}
          {([
            ['Time per occurrence', [['<30m','< 30 min'],['30m-2h','30 min – 2 hrs'],['half-day','Half day'],['day+','A full day']] as [string,string][], tpo, onTpo],
            ['How often', [['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['quarterly','Quarterly'],['adhoc','Ad hoc']] as [string,string][], freq, onFreq],
            ['Energy', [['energizing','Energizes'],['fine','Fine'],['tedious','Tedious'],['draining','Drains']] as [string,string][], energy, onEnergy],
          ] as const).map(([label, opts, val, setter]) => (
            <div key={label as string} style={{ marginBottom: 14 }}>
              <label className="wa-label">{label as string}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(opts as [string, string][]).map(([v, lbl]) => {
                  const on = v === (val as string);
                  return (
                    <button key={v} onClick={() => (setter as (v: string) => void)(v)} style={{
                      flex: 1, padding: '9px 10px', background: on ? 'var(--ink)' : '#fff', color: on ? 'var(--cream)' : 'var(--ink)',
                      border: '1px solid ' + (on ? 'var(--ink)' : 'var(--rule)'), borderRadius: 4, cursor: 'pointer', fontWeight: on ? 500 : 400, fontSize: 12.5,
                    }}>{lbl}</button>
                  );
                })}
              </div>
            </div>
          ))}

          <hr className="wa-rule" style={{ margin: '18px 0' }} />

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <label className="wa-label" style={{ margin: 0 }}>Team verdict · automatability</label>
            <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>set during discussion</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {([['yes','Automatable','rust'],['maybe','Maybe','amber'],['no','Manual forever','']] as const).map(([v, label, t]) => {
              const on = v === verdict;
              return (
                <button key={v} onClick={() => onVerdict(v)} style={{
                  flex: 1, padding: '9px 8px',
                  background: on ? (t === 'rust' ? 'var(--rust)' : t === 'amber' ? 'var(--amber)' : 'var(--ink)') : '#fff',
                  color: on ? '#fff' : 'var(--ink-2)',
                  border: '1px solid ' + (on ? 'transparent' : 'var(--rule)'),
                  borderRadius: 4, cursor: 'pointer', fontWeight: on ? 600 : 500, fontSize: 12.5,
                }}>{label}</button>
              );
            })}
          </div>

          <label className="wa-label">Discussion note (optional)</label>
          <textarea
            className="wa-input"
            style={{ minHeight: 64, fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, resize: 'vertical' }}
            value={note}
            onChange={e => onNote(e.target.value)}
            placeholder="Add context for the team…"
          />

          {activity.flagged && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--rust-bg)', border: '1px solid #e8c8b8', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'var(--flag)', fontSize: 16 }}>★</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#6a2810' }}>Flagged for next quarter</div>
                <div style={{ fontSize: 11.5, color: '#6a2810', opacity: 0.85 }}>Will appear in the priority export</div>
              </div>
            </div>
          )}

          {activity.editHistory && activity.editHistory.length > 0 && (
            <details style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', letterSpacing: '0.06em' }}>↳ EDIT HISTORY · {activity.editHistory.length} entries</span>
                <span style={{ fontSize: 10, color: 'var(--muted-2)' }}>▾</span>
              </summary>
              <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--paper)', border: '1px solid var(--border-soft)', borderRadius: 4 }}>
                {activity.editHistory.map((e, i) => (
                  <div key={i} className="wa-mono" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                    <span style={{ color: 'var(--muted-2)' }}>{new Date(e.at).toLocaleTimeString()} · {e.who}</span> {e.what}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-soft)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="wa-btn is-ghost" style={{ padding: '8px 14px', fontSize: 13, color: 'var(--rust)', borderColor: '#e8c8b8' }} onClick={onRemove}>
            × Remove activity
          </button>
          <span style={{ flex: 1 }} />
          <button className="wa-btn is-ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={onClose}>Cancel</button>
          <button className="wa-btn" onClick={onSave}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MERGE MODAL
// ══════════════════════════════════════════════════════════════════════════════

function MergeModal({
  source, candidates, selected, onToggle,
  search, onSearch,
  title, tpo, freq, energy,
  onTitle, onTpo, onFreq, onEnergy,
  onMerge, onClose,
}: {
  source: Activity;
  candidates: MergeCandidate[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  search: string;
  onSearch: (v: string) => void;
  title: string;
  tpo: TimePerOccurrence;
  freq: Frequency;
  energy: Energy;
  onTitle: (v: string) => void;
  onTpo: (v: TimePerOccurrence) => void;
  onFreq: (v: Frequency) => void;
  onEnergy: (v: Energy) => void;
  onMerge: () => void;
  onClose: () => void;
}) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  useEffect(() => { searchRef.current?.focus(); }, []);

  const q = search.toLowerCase();
  const filtered = candidates.filter(c =>
    !q || c.title.toLowerCase().includes(q) || c.participantName.toLowerCase().includes(q)
  );

  const selectedSources = [source, ...candidates.filter(c => c.id !== source.id && selected.has(c.id))];
  const totalHrs = selectedSources.reduce((sum, a) => sum + calcEffort(a.tpo, a.freq).hrs, 0);

  const canMerge = selected.size >= 2;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,26,22,0.5)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 900, maxHeight: '90vh', background: 'var(--cream)',
        borderRadius: 8, boxShadow: '0 24px 80px rgba(0,0,0,0.36)',
        border: '1px solid var(--rule)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <Eyebrow color="var(--rust)">↳ Facilitator action · merge activities</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 20, margin: '4px 0 0', fontWeight: 500 }}>
              Select cards to merge — a new card is created, originals are kept.
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, fontSize: 20, color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Body — two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
          {/* Left — candidate checklist */}
          <div style={{ padding: '18px 20px', borderRight: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Source card */}
            <div className="wa-eyebrow" style={{ marginBottom: 8 }}>Select cards to merge · {selected.size} selected</div>
            <div style={{ padding: '10px 12px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 5, marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 3, background: 'var(--ink)',
                border: '2px solid var(--ink)', flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12,
              }}>✓</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span className="wa-avatar is-sm" style={{ background: source.participantColor, color: '#fff' }}>{source.participantInitials}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{source.participantName.split(' ')[0]}</span>
                  <span className="wa-chip is-ghost" style={{ fontSize: 9, padding: '1px 5px' }}>starting card</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{source.title}</div>
                <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {source.participantName.split(' ')[0]} · {TPO_SHORT[source.tpo]} · {FREQ_SHORT[source.freq]}
                </div>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 13 }}>⌕</span>
              <input
                ref={searchRef}
                className="wa-input"
                style={{ paddingLeft: 30, paddingRight: 30, fontSize: 12.5 }}
                placeholder="Search other activities…"
                value={search}
                onChange={e => onSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => onSearch('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: 0 }}
                >×</button>
              )}
            </div>

            {/* Candidate list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted-2)', fontStyle: 'italic', padding: '8px 0' }}>
                  No activities match &apos;{search}&apos;.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {filtered.map(c => {
                    const isChecked = selected.has(c.id);
                    const showBadge = c.similarity > 0.15;
                    const badgeTone = c.similarity > 0.60 ? 'is-rust' : c.similarity > 0.30 ? 'is-amber' : '';
                    return (
                      <div
                        key={c.id}
                        onClick={() => onToggle(c.id)}
                        style={{
                          padding: '9px 12px', background: isChecked ? 'var(--paper)' : '#fff',
                          border: `1px solid ${isChecked ? 'var(--ink)' : 'var(--border-soft)'}`,
                          borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 3, flexShrink: 0, marginTop: 1,
                          border: `2px solid ${isChecked ? 'var(--ink)' : 'var(--border-soft)'}`,
                          background: isChecked ? 'var(--ink)' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12,
                        }}>{isChecked ? '✓' : ''}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span className="wa-avatar is-sm" style={{ background: c.participantColor, color: '#fff' }}>{c.participantInitials}</span>
                            <span style={{ fontSize: 12 }}>{c.participantName.split(' ')[0]}</span>
                            {showBadge && (
                              <span className={`wa-chip ${badgeTone}`} style={{ fontSize: 9, padding: '1px 5px', marginLeft: 'auto' }}>
                                {Math.round(c.similarity * 100)}%
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 3 }}>{c.title}</div>
                          <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                            {c.participantName.split(' ')[0]} · {TPO_SHORT[c.tpo]} · {FREQ_SHORT[c.freq]}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right — editable merged card preview */}
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="wa-eyebrow" style={{ marginBottom: 12 }}>Merged card — edit before creating</div>

            {/* Avatar stack + author line + effort chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex' }}>
                {selectedSources.map((a, i) => (
                  <span
                    key={a.id}
                    className="wa-avatar is-sm"
                    style={{
                      background: a.participantColor, color: '#fff',
                      marginLeft: i === 0 ? 0 : -8,
                      border: '2px solid var(--cream)',
                      zIndex: selectedSources.length - i,
                      position: 'relative',
                    }}
                  >
                    {a.participantInitials}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 12.5, flex: 1 }}>
                {selectedSources.map(a => a.participantName.split(' ')[0]).join(' + ')}
              </span>
              <span className="wa-chip is-sage" style={{ fontSize: 10, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                ⇄ {selected.size} cards · ~{totalHrs.toFixed(1)} h/wk
              </span>
            </div>

            {/* Editable fields */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="wa-label" style={{ marginBottom: 4, display: 'block' }}>Title</label>
                <input
                  className="wa-input"
                  style={{ fontSize: 14, fontWeight: 600, padding: '9px 12px' }}
                  value={title}
                  onChange={e => onTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="wa-label" style={{ marginBottom: 4, display: 'block' }}>Time per occurrence</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
                  {([['<30m','<30 min'],['30m-2h','30m–2h'],['half-day','½ day'],['day+','1+ day']] as [TimePerOccurrence, string][]).map(([v, lbl]) => {
                    const on = v === tpo;
                    return (
                      <button key={v} onClick={() => onTpo(v)} style={{
                        padding: '8px 4px', fontSize: 11.5, textAlign: 'center',
                        background: on ? 'var(--ink)' : '#fff', color: on ? 'var(--cream)' : 'var(--ink)',
                        border: '1px solid ' + (on ? 'var(--ink)' : 'var(--rule)'), borderRadius: 4, cursor: 'pointer',
                      }}>{lbl}</button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="wa-label" style={{ marginBottom: 4, display: 'block' }}>Frequency</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 5 }}>
                  {([['daily','Daily'],['weekly','Weekly'],['monthly','Mthly'],['quarterly','Qtrly'],['adhoc','Ad hoc']] as [Frequency, string][]).map(([v, lbl]) => {
                    const on = v === freq;
                    return (
                      <button key={v} onClick={() => onFreq(v)} style={{
                        padding: '8px 2px', fontSize: 10.5, textAlign: 'center',
                        background: on ? 'var(--ink)' : '#fff', color: on ? 'var(--cream)' : 'var(--ink)',
                        border: '1px solid ' + (on ? 'var(--ink)' : 'var(--rule)'), borderRadius: 4, cursor: 'pointer',
                      }}>{lbl}</button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="wa-label" style={{ marginBottom: 4, display: 'block' }}>Energy</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
                  {([['energizing','Energizing'],['fine','Fine'],['tedious','Tedious'],['draining','Draining']] as [Energy, string][]).map(([v, lbl]) => {
                    const on = v === energy;
                    return (
                      <button key={v} onClick={() => onEnergy(v)} style={{
                        padding: '8px 4px', fontSize: 11.5, textAlign: 'center',
                        background: on ? 'var(--ink)' : '#fff', color: on ? 'var(--cream)' : 'var(--ink)',
                        border: '1px solid ' + (on ? 'var(--ink)' : 'var(--rule)'), borderRadius: 4, cursor: 'pointer',
                      }}>{lbl}</button>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--paper)', border: '1px dashed var(--border-soft)', borderRadius: 4, fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                ↳ Original cards are kept and linked to this merged card so you can trace back to what was submitted.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: canMerge ? 'var(--ink-2)' : 'var(--muted)', flex: 1 }}>
            {canMerge
              ? `Creating 1 merged card from ${selected.size} originals.`
              : 'Select at least one more card to merge.'}
          </span>
          <button className="wa-btn is-ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={onClose}>Cancel</button>
          <button
            className="wa-btn is-rust"
            style={{ padding: '8px 16px', fontSize: 13, opacity: canMerge ? 1 : 0.45, cursor: canMerge ? 'pointer' : 'not-allowed' }}
            onClick={canMerge ? onMerge : undefined}
            disabled={!canMerge}
          >
            ⇄ Create merged card →
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT MODAL
// ══════════════════════════════════════════════════════════════════════════════

function ExportModal({ markdown, sessionName, onCopy, copied, onClose }: {
  markdown: string;
  sessionName: string;
  onCopy: () => void;
  copied: boolean;
  onClose: () => void;
}) {
  const filename = `${sessionName.toLowerCase().replace(/[^\w]+/g, '-')}-audit.md`;

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,26,22,0.45)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 860, maxHeight: '88dvh', background: 'var(--cream)',
        borderRadius: 8, boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
        border: '1px solid var(--rule)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Eyebrow>Export · session output</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 22, margin: '4px 0 0', fontWeight: 500 }}>Take the priorities with you</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, fontSize: 20, color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', flex: 1, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', padding: '20px 24px', background: '#fff', borderRight: '1px solid var(--border-soft)' }}>
            <pre className="wa-mono" style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--ink)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {markdown}
            </pre>
          </div>

          <aside style={{ padding: '20px 18px', background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Eyebrow>Includes</Eyebrow>
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {[
                  'Flagged priorities',
                  'All activities',
                  'Discussion notes',
                  'Team verdict (auto)',
                  'Effort per item (~h/wk)',
                  'Author attribution',
                ].map((label, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--ink)', border: '1px solid var(--rule)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cream)', fontSize: 10, flexShrink: 0 }}>✓</span>
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px dashed var(--rule)', borderRadius: 4, padding: '10px 12px', fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>↳ TEAM VERDICT</div>
              Automatability was tagged during the discussion phase — team consensus, not self-report.
            </div>

            <hr className="wa-rule" />

            <div>
              <Eyebrow>Filename</Eyebrow>
              <input className="wa-input" style={{ fontSize: 12, padding: '7px 9px', marginTop: 6 }} value={filename} readOnly />
            </div>

            <div style={{ marginTop: 'auto', display: 'grid', gap: 8 }}>
              <button className="wa-btn" style={{ justifyContent: 'center' }} onClick={onCopy}>
                {copied ? '✓ Copied!' : 'Copy to clipboard'}
              </button>
              <button className="wa-btn is-ghost" style={{ justifyContent: 'center' }} onClick={handleDownload}>
                Download .md
              </button>
              <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', textAlign: 'center', marginTop: 4 }}>
                ↳ MCP connector available · use get_session or export_session_markdown
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
