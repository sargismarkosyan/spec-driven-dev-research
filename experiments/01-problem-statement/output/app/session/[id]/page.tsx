'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';

type Role = 'engineer' | 'facilitator';
type Energy = 'drains' | 'energizes';
type Verdict = 'automate' | 'eliminate' | 'handoff' | 'keep';
type Phase = 'lobby' | 'input' | 'discussion' | 'closed';

type Participant = { id: string; name: string; role: Role };
type Activity = {
  id: string; sessionId: string; authorId: string; authorName: string;
  description: string; durationMinutes: number; frequencyPerWeek: number;
  weeklyMinutes: number; energy: Energy; verdict?: Verdict; flagged: boolean;
  mergedFromIds: string[]; mergedAuthorNames: string[]; createdAt: string;
};
type Session = { id: string; phase: Phase };

// ── Join form ──────────────────────────────────────────────────────────────────

function JoinForm({ sessionId, onJoin }: { sessionId: string; onJoin: (name: string, role: Role) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('engineer');
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">Join Session</h1>
        <p className="text-gray-500 text-sm mb-6 font-mono break-all">{sessionId}</p>
        <div className="flex flex-col gap-3">
          <input
            type="text" placeholder="Your name" value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onJoin(name.trim(), role)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            {(['engineer', 'facilitator'] as Role[]).map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${role === r ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => name.trim() && onJoin(name.trim(), role)} disabled={!name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40">
            Join
          </button>
        </div>
      </div>
    </main>
  );
}

// ── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({
  activity, selected, isFacilitator, mergeMode,
  onClick, onFlag, onVerdict, onDelete, onEdit, onMergeTarget,
}: {
  activity: Activity; selected: boolean; isFacilitator: boolean; mergeMode: boolean;
  onClick: () => void; onFlag: () => void; onVerdict: (v: Verdict) => void;
  onDelete: () => void; onEdit: (desc: string) => void; onMergeTarget: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(activity.description);
  const allAuthors = activity.mergedAuthorNames.length > 0
    ? [activity.authorName, ...activity.mergedAuthorNames].join(', ')
    : activity.authorName;

  return (
    <div
      onClick={mergeMode ? onMergeTarget : onClick}
      className={`rounded-xl border p-4 cursor-pointer transition-all ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' :
        mergeMode ? 'border-orange-300 hover:border-orange-500 hover:ring-2 hover:ring-orange-200' :
        'border-gray-100 hover:border-gray-200'
      } bg-white shadow-sm`}
    >
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { onEdit(editVal); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
            onClick={e => e.stopPropagation()}
            className="flex-1 border border-blue-300 rounded px-2 py-0.5 text-sm focus:outline-none"
          />
        ) : (
          <p className="text-sm text-gray-800 flex-1">{activity.description}</p>
        )}
        {activity.flagged && <span className="text-orange-500 text-xs font-bold shrink-0">⚑</span>}
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activity.energy === 'drains' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {activity.energy}
        </span>
        <span className="text-xs text-gray-500">{activity.weeklyMinutes} min/wk</span>
        {activity.verdict && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{activity.verdict}</span>
        )}
        {activity.mergedFromIds.length > 0 && (
          <span className="text-xs text-gray-400">{activity.mergedFromIds.length + 1} merged</span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">{allAuthors}</p>

      {selected && isFacilitator && !mergeMode && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
          <div className="flex gap-1 flex-wrap">
            {(['automate', 'eliminate', 'handoff', 'keep'] as Verdict[]).map(v => (
              <button key={v} onClick={() => onVerdict(v)}
                className={`text-xs px-2 py-1 rounded-md border transition-colors ${activity.verdict === v ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={() => onFlag()}
              className={`text-xs px-2 py-1 rounded-md border transition-colors ${activity.flagged ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
              {activity.flagged ? '⚑ Flagged' : '⚐ Flag'}
            </button>
            <button onClick={() => { setEditVal(activity.description); setEditing(true); }}
              className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:border-blue-300 transition-colors">
              Edit
            </button>
            <button onClick={() => onDelete()}
              className="text-xs px-2 py-1 rounded-md border border-gray-200 text-red-500 hover:border-red-300 transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quadrant view ──────────────────────────────────────────────────────────────

function Quadrant({ activities, selectedId, onSelect }: {
  activities: Activity[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const maxMinutes = Math.max(...activities.map(a => a.weeklyMinutes), 1);

  return (
    <div className="relative w-full aspect-square bg-white border border-gray-200 rounded-xl overflow-hidden select-none">
      {/* Quadrant zone labels */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
        <div className="border-r border-b border-dashed border-gray-200 flex items-start justify-start p-2">
          <span className="text-xs text-gray-300">drains · low cost</span>
        </div>
        <div className="border-b border-dashed border-gray-200 flex items-start justify-end p-2">
          <span className="text-xs text-red-300 font-medium">drains · high cost ⚑</span>
        </div>
        <div className="border-r border-dashed border-gray-200 flex items-end justify-start p-2">
          <span className="text-xs text-gray-300">energizes · low cost</span>
        </div>
        <div className="flex items-end justify-end p-2">
          <span className="text-xs text-green-300">energizes · high cost</span>
        </div>
      </div>

      {/* Axis labels */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-400 pointer-events-none">
        weekly time cost →
      </div>
      <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-400 pointer-events-none whitespace-nowrap">
        energy impact →
      </div>

      {/* Activities */}
      {activities.map(a => {
        const x = (a.weeklyMinutes / maxMinutes) * 80 + 10; // 10–90%
        const y = a.energy === 'drains' ? 20 : 70; // top half = drains
        return (
          <button
            key={a.id}
            onClick={() => onSelect(a.id)}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all ${
              selectedId === a.id ? 'z-10' : 'z-0'
            }`}
            title={`${a.description} — ${a.weeklyMinutes} min/wk`}
          >
            <div className={`rounded-full flex items-center justify-center text-white text-xs font-bold transition-all ${
              a.flagged ? 'bg-orange-500' : a.energy === 'drains' ? 'bg-red-400' : 'bg-green-400'
            } ${selectedId === a.id ? 'w-8 h-8 ring-2 ring-offset-1 ring-blue-500' : 'w-6 h-6 hover:w-8 hover:h-8'}`}>
              {a.description.charAt(0).toUpperCase()}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Main session page ─────────────────────────────────────────────────────────

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [myName, setMyName] = useState('');
  const [myRole, setMyRole] = useState<Role>('engineer');
  const [joined, setJoined] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Activity form
  const [desc, setDesc] = useState('');
  const [duration, setDuration] = useState(30);
  const [freq, setFreq] = useState(3);
  const [energy, setEnergy] = useState<Energy>('drains');

  // Facilitator state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);

  const feedEndRef = useRef<HTMLDivElement>(null);

  // Initialise from localStorage
  useEffect(() => {
    const storedName = localStorage.getItem(`session_${sessionId}_name`);
    const storedRole = localStorage.getItem(`session_${sessionId}_role`) as Role | null;
    if (storedName && storedRole) {
      setMyName(storedName);
      setMyRole(storedRole);
    }
  }, [sessionId]);

  // Connect when name is set
  useEffect(() => {
    if (!myName) return;
    socket.connect();
    socket.emit('join', { name: myName, sessionId, role: myRole });

    socket.on('state', ({ session, activities, participants }: { session: Session; activities: Activity[]; participants: Participant[] }) => {
      setSession(session); setActivities(activities); setParticipants(participants); setJoined(true);
    });
    socket.on('user:joined', (p: Participant) => setParticipants(prev => [...prev.filter(x => x.id !== p.id), p]));
    socket.on('user:left', (id: string) => setParticipants(prev => prev.filter(x => x.id !== id)));
    socket.on('activity:added', (a: Activity) => setActivities(prev => [...prev, a]));
    socket.on('activity:updated', (a: Activity) => setActivities(prev => prev.map(x => x.id === a.id ? a : x)));
    socket.on('activity:deleted', (id: string) => {
      setActivities(prev => prev.filter(x => x.id !== id));
      setSelectedId(s => s === id ? null : s);
    });
    socket.on('activity:merged', ({ merged, removedIds }: { merged: Activity; removedIds: string[] }) => {
      setActivities(prev => [...prev.filter(x => !removedIds.includes(x.id) && x.id !== merged.id), merged]);
      setMergeMode(false); setMergeSourceId(null);
    });
    socket.on('session:phase', (phase: Phase) => setSession(prev => prev ? { ...prev, phase } : null));
    socket.on('error', (msg: string) => alert(msg));

    return () => {
      ['state', 'user:joined', 'user:left', 'activity:added', 'activity:updated',
        'activity:deleted', 'activity:merged', 'session:phase', 'error'].forEach(e => socket.off(e));
      socket.disconnect();
    };
  }, [myName, myRole, sessionId]);

  // Auto-scroll feed
  useEffect(() => { feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activities.length]);

  const submitActivity = () => {
    if (!desc.trim()) return;
    socket.emit('activity:add', { description: desc.trim(), durationMinutes: duration, frequencyPerWeek: freq, energy });
    setDesc('');
  };

  const updateActivity = (id: string, patch: Partial<{ description: string; verdict: Verdict; flagged: boolean }>) => {
    socket.emit('activity:update', { id, ...patch });
  };

  const deleteActivity = (id: string) => {
    if (!confirm('Delete this activity?')) return;
    socket.emit('activity:delete', id);
  };

  const startMerge = (sourceId: string) => {
    setMergeSourceId(sourceId);
    setMergeMode(true);
    setSelectedId(null);
  };

  const doMerge = (targetId: string) => {
    if (!mergeSourceId || targetId === mergeSourceId) { setMergeMode(false); setMergeSourceId(null); return; }
    socket.emit('activity:merge', { keepId: mergeSourceId, removeId: targetId });
    setSelectedId(mergeSourceId);
  };

  const advance = () => socket.emit('session:advance');

  const exportSession = () => window.open(`/api/sessions/${sessionId}/export`, '_blank');

  const copyJoinLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  // ── Render: not yet joined ─────────────────────────────────────────────────

  if (!myName) {
    return (
      <JoinForm sessionId={sessionId} onJoin={(name, role) => {
        localStorage.setItem(`session_${sessionId}_name`, name);
        localStorage.setItem(`session_${sessionId}_role`, role);
        setMyName(name); setMyRole(role);
      }} />
    );
  }

  if (!joined || !session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Connecting…</p>
      </main>
    );
  }

  const isFacilitator = myRole === 'facilitator';
  const sessionActivities = activities.filter(a => a.sessionId === sessionId);
  const selectedActivity = sessionActivities.find(a => a.id === selectedId) ?? null;

  // ── Lobby ──────────────────────────────────────────────────────────────────

  if (session.phase === 'lobby') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 w-full max-w-sm">
          <h2 className="text-xl font-semibold mb-1">Waiting room</h2>
          <p className="text-sm text-gray-500 mb-4">Share this session code with your team.</p>
          <div className="flex items-center gap-2 mb-6">
            <code className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 border border-gray-200 break-all">
              {sessionId}
            </code>
            <button onClick={copyJoinLink}
              className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              Copy link
            </button>
          </div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Participants ({participants.length})
          </p>
          <ul className="flex flex-col gap-1 mb-6">
            {participants.map(p => (
              <li key={p.id} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                {p.name}
                {p.role === 'facilitator' && <span className="text-xs text-gray-400">(facilitator)</span>}
              </li>
            ))}
          </ul>
          {isFacilitator ? (
            <button onClick={advance}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">
              Start session →
            </button>
          ) : (
            <p className="text-sm text-gray-400 text-center">Waiting for the facilitator to start…</p>
          )}
        </div>
      </div>
    );
  }

  // ── Input phase ────────────────────────────────────────────────────────────

  if (session.phase === 'input') {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">Toil Tracker</h1>
            <p className="text-xs text-gray-400">Log your recurring work activities</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {participants.map(p => (
                <span key={p.id} title={p.name}
                  className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                  {p.name.charAt(0).toUpperCase()}
                </span>
              ))}
              <span className="text-xs text-gray-400 ml-1">{participants.length} connected</span>
            </div>
            {isFacilitator && (
              <button onClick={advance}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors">
                Close submissions →
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 flex gap-0 overflow-hidden">
          {/* Form panel */}
          <div className="w-80 bg-white border-r border-gray-100 p-6 flex flex-col gap-4 shrink-0">
            <h2 className="font-medium text-gray-900">Add an activity</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">What do you do?</label>
                <textarea
                  value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                  placeholder="e.g. Manually update deployment configs before each release"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duration (min)</label>
                  <input type="number" min={1} value={duration} onChange={e => setDuration(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Times/week</label>
                  <input type="number" min={0.5} step={0.5} value={freq} onChange={e => setFreq(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Energy impact</label>
                <div className="flex gap-2">
                  {(['drains', 'energizes'] as Energy[]).map(e => (
                    <button key={e} onClick={() => setEnergy(e)}
                      className={`flex-1 py-1.5 rounded-lg text-sm border transition-colors ${energy === e
                        ? e === 'drains' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-green-50 border-green-400 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                Weekly cost: <span className="font-semibold text-gray-700">{duration * freq} min</span>
              </div>
              <button onClick={submitActivity} disabled={!desc.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40">
                Submit activity
              </button>
            </div>
          </div>

          {/* Feed */}
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="font-medium text-gray-900 mb-4">Team feed ({sessionActivities.length})</h2>
            {sessionActivities.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing submitted yet. Be the first.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {sessionActivities.map(a => (
                  <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <p className="text-sm text-gray-800">{a.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.energy === 'drains' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {a.energy}
                      </span>
                      <span className="text-xs text-gray-500">{a.weeklyMinutes} min/wk</span>
                      <span className="text-xs text-gray-400 ml-auto">{a.authorName}</span>
                    </div>
                  </div>
                ))}
                <div ref={feedEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Discussion phase ───────────────────────────────────────────────────────

  if (session.phase === 'discussion') {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="font-semibold text-gray-900">Toil Tracker — Discussion</h1>
            <p className="text-xs text-gray-400">{sessionActivities.length} activities · {sessionActivities.filter(a => a.flagged).length} flagged</p>
          </div>
          <div className="flex items-center gap-2">
            {mergeMode && (
              <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg font-medium">
                Select activity to merge into selected one
                <button className="ml-2 underline" onClick={() => { setMergeMode(false); setMergeSourceId(null); }}>Cancel</button>
              </span>
            )}
            {isFacilitator && (
              <button onClick={advance}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors">
                Close session →
              </button>
            )}
          </div>
        </header>

        {isFacilitator ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Quadrant */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <Quadrant activities={sessionActivities} selectedId={selectedId}
                onSelect={id => {
                  if (mergeMode) { doMerge(id); return; }
                  setSelectedId(prev => prev === id ? null : id);
                }} />
            </div>

            {/* Side panel */}
            <div className="w-72 bg-white border-l border-gray-100 overflow-y-auto shrink-0">
              {selectedActivity ? (
                <div className="p-4 flex flex-col gap-3">
                  <h3 className="font-medium text-sm text-gray-900">{selectedActivity.description}</h3>
                  <div className="flex flex-col gap-1 text-xs text-gray-500">
                    <span>{selectedActivity.weeklyMinutes} min/week</span>
                    <span>{selectedActivity.authorName}{selectedActivity.mergedAuthorNames.length > 0 ? `, ${selectedActivity.mergedAuthorNames.join(', ')}` : ''}</span>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1 font-medium">Verdict</p>
                    <div className="grid grid-cols-2 gap-1">
                      {(['automate', 'eliminate', 'handoff', 'keep'] as Verdict[]).map(v => (
                        <button key={v} onClick={() => updateActivity(selectedActivity.id, { verdict: v })}
                          className={`text-xs py-1.5 rounded-md border transition-colors ${selectedActivity.verdict === v ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => updateActivity(selectedActivity.id, { flagged: !selectedActivity.flagged })}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors ${selectedActivity.flagged ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                      {selectedActivity.flagged ? '⚑ Flagged' : '⚐ Flag priority'}
                    </button>
                    <button onClick={() => startMerge(selectedActivity.id)}
                      className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">
                      Merge…
                    </button>
                    <button onClick={() => deleteActivity(selectedActivity.id)}
                      className="text-xs px-2 py-1 rounded-md border border-gray-200 text-red-500 hover:border-red-300 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-sm text-gray-400">Click an activity on the quadrant to select it.</p>
                </div>
              )}

              <div className="border-t border-gray-100 p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">All activities</p>
                <div className="flex flex-col gap-2">
                  {[...sessionActivities].sort((a, b) => b.weeklyMinutes - a.weeklyMinutes).map(a => (
                    <button key={a.id} onClick={() => {
                      if (mergeMode) { doMerge(a.id); return; }
                      setSelectedId(prev => prev === a.id ? null : a.id);
                    }}
                      className={`text-left text-xs p-2 rounded-lg border transition-colors ${selectedId === a.id ? 'border-blue-400 bg-blue-50' : mergeMode ? 'border-orange-200 hover:border-orange-400' : 'border-gray-100 hover:border-gray-200'}`}>
                      <div className="flex items-center gap-1">
                        {a.flagged && <span className="text-orange-500">⚑</span>}
                        <span className="truncate">{a.description}</span>
                      </div>
                      <span className="text-gray-400">{a.weeklyMinutes} min/wk · {a.energy}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Engineer view during discussion */
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="font-medium text-gray-900 mb-4">Activities</h2>
            <div className="grid grid-cols-2 gap-3 max-w-2xl">
              {[...sessionActivities].sort((a, b) => b.weeklyMinutes - a.weeklyMinutes).map(a => (
                <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm text-gray-800">{a.description}</p>
                    {a.flagged && <span className="text-orange-500 shrink-0">⚑</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.energy === 'drains' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {a.energy}
                    </span>
                    <span className="text-xs text-gray-500">{a.weeklyMinutes} min/wk</span>
                    {a.verdict && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{a.verdict}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Closed phase ───────────────────────────────────────────────────────────

  const flagged = sessionActivities.filter(a => a.flagged).sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);
  const totalMinutes = sessionActivities.reduce((s, a) => s + a.weeklyMinutes, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">Session complete</h1>
          <p className="text-xs text-gray-400">{sessionActivities.length} activities · {totalMinutes} min/week total toil identified</p>
        </div>
        {isFacilitator && (
          <button onClick={exportSession}
            className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors">
            Export markdown
          </button>
        )}
      </header>

      <div className="flex-1 p-6 max-w-2xl">
        <h2 className="font-medium text-gray-900 mb-1">Flagged priorities</h2>
        <p className="text-sm text-gray-500 mb-4">These are the activities the team identified as highest priority to address.</p>

        {flagged.length === 0 ? (
          <p className="text-sm text-gray-400">No items were flagged during the session.</p>
        ) : (
          <div className="flex flex-col gap-3 mb-8">
            {flagged.map((a, i) => {
              const authors = a.mergedAuthorNames.length > 0
                ? [a.authorName, ...a.mergedAuthorNames].join(', ')
                : a.authorName;
              return (
                <div key={a.id} className="bg-white rounded-xl border border-orange-200 shadow-sm p-4 flex gap-4">
                  <div className="text-2xl font-bold text-orange-200 w-8 shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{a.description}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.energy === 'drains' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {a.energy}
                      </span>
                      <span className="text-xs text-gray-500">{a.weeklyMinutes} min/wk</span>
                      {a.verdict && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{a.verdict}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{authors}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <h2 className="font-medium text-gray-900 mb-3">All activities</h2>
        <div className="flex flex-col gap-2">
          {[...sessionActivities].sort((a, b) => b.weeklyMinutes - a.weeklyMinutes).map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
              {a.flagged && <span className="text-orange-500 shrink-0">⚑</span>}
              <span className="text-sm text-gray-800 flex-1">{a.description}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.energy === 'drains' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {a.energy}
                </span>
                <span className="text-xs text-gray-500">{a.weeklyMinutes} min/wk</span>
                {a.verdict && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{a.verdict}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
