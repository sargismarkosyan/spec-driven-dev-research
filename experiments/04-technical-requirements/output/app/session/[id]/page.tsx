'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { socket } from '@/lib/socket';

type Participant = { id: string; name: string; sessionId: string };

type Activity = {
  id: string;
  participantId: string;
  title: string;
  timeEstimate: 'quick' | 'medium' | 'significant';
  enjoyment: 'yes' | 'meh' | 'no';
  repetitive: 'yes' | 'sometimes' | 'no';
  automatable: 'yes' | 'maybe' | 'no';
  flaggedByFacilitator: boolean;
};

type Session = {
  id: string;
  name: string;
  status: 'open' | 'reviewing' | 'closed';
  participants: Participant[];
  activities: Activity[];
};

type FormData = {
  title: string;
  timeEstimate: Activity['timeEstimate'];
  enjoyment: Activity['enjoyment'];
  repetitive: Activity['repetitive'];
  automatable: Activity['automatable'];
};

const BLANK: FormData = {
  title: '',
  timeEstimate: 'medium',
  enjoyment: 'meh',
  repetitive: 'sometimes',
  automatable: 'maybe',
};

const STATUS_LABEL: Record<Session['status'], string> = {
  open: 'Open',
  reviewing: 'Reviewing',
  closed: 'Closed',
};
const STATUS_NEXT: Record<Session['status'], Session['status'] | null> = {
  open: 'reviewing',
  reviewing: 'closed',
  closed: null,
};
const STATUS_COLOR: Record<Session['status'], string> = {
  open: 'bg-green-100 text-green-700',
  reviewing: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
};

function RadioGroup({ label, name, options, value, onChange }: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-3">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-700">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ActivityForm({ formKey, initial, onSubmit, onCancel }: {
  formKey: string;
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<FormData>({ ...BLANK, ...initial });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 shadow-sm">
      <input
        placeholder="What activity? e.g. Write weekly incident report"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <RadioGroup
        label="Time estimate"
        name={`te-${formKey}`}
        options={[
          { value: 'quick', label: 'Quick (<30 min)' },
          { value: 'medium', label: 'Medium (30–120 min)' },
          { value: 'significant', label: 'Significant (>2 h)' },
        ]}
        value={form.timeEstimate}
        onChange={v => setForm(f => ({ ...f, timeEstimate: v as FormData['timeEstimate'] }))}
      />
      <RadioGroup
        label="Do you enjoy it?"
        name={`ej-${formKey}`}
        options={[{ value: 'yes', label: 'Yes' }, { value: 'meh', label: 'Meh' }, { value: 'no', label: 'No' }]}
        value={form.enjoyment}
        onChange={v => setForm(f => ({ ...f, enjoyment: v as FormData['enjoyment'] }))}
      />
      <RadioGroup
        label="Is it repetitive?"
        name={`rep-${formKey}`}
        options={[{ value: 'yes', label: 'Yes' }, { value: 'sometimes', label: 'Sometimes' }, { value: 'no', label: 'No' }]}
        value={form.repetitive}
        onChange={v => setForm(f => ({ ...f, repetitive: v as FormData['repetitive'] }))}
      />
      <RadioGroup
        label="Could it be automated?"
        name={`auto-${formKey}`}
        options={[{ value: 'yes', label: 'Yes' }, { value: 'maybe', label: 'Maybe' }, { value: 'no', label: 'No' }]}
        value={form.automatable}
        onChange={v => setForm(f => ({ ...f, automatable: v as FormData['automatable'] }))}
      />
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { if (form.title.trim()) onSubmit({ ...form, title: form.title.trim() }); }}
          disabled={!form.title.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm
                     font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {initial ? 'Save Changes' : 'Add Activity'}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-sm px-4 py-2">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

const AUTOMATABLE_COLORS: Record<Activity['automatable'], string> = {
  yes: 'border-green-200 bg-green-50',
  maybe: 'border-yellow-200 bg-yellow-50',
  no: 'border-red-100 bg-red-50',
};

function ActivityCard({ activity, participantName, isOwn, sessionOpen, onEdit, onDelete }: {
  activity: Activity;
  participantName: string;
  isOwn: boolean;
  sessionOpen: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2
      ${AUTOMATABLE_COLORS[activity.automatable]}
      ${activity.flaggedByFacilitator ? 'ring-2 ring-yellow-400' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 leading-snug">{activity.title}</p>
        {activity.flaggedByFacilitator && <span className="text-yellow-500 shrink-0 text-base">★</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip>⏱ {activity.timeEstimate}</Chip>
        <Chip>😊 {activity.enjoyment}</Chip>
        <Chip>🔁 {activity.repetitive}</Chip>
        <Chip>🤖 {activity.automatable}</Chip>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500">{participantName}</span>
        {isOwn && sessionOpen && (
          <div className="flex gap-3">
            <button onClick={onEdit} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
            <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs bg-white/70 rounded px-1.5 py-0.5 text-gray-600">{children}</span>
  );
}

function StatusBadge({ status }: { status: Session['status'] }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── Facilitator view ───────────────────────────────────────────────────────────

function FacilitatorView({ session, facilitatorToken, onStatusChange, onFlag, onExport }: {
  session: Session;
  facilitatorToken: string;
  onStatusChange: (s: Session['status']) => void;
  onFlag: (activityId: string) => void;
  onExport: () => void;
}) {
  const next = STATUS_NEXT[session.status];
  const grouped = {
    yes: session.activities.filter(a => a.automatable === 'yes'),
    maybe: session.activities.filter(a => a.automatable === 'maybe'),
    no: session.activities.filter(a => a.automatable === 'no'),
  };
  const colHeaders: Record<string, string> = {
    yes: 'text-green-700',
    maybe: 'text-yellow-700',
    no: 'text-red-700',
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{session.name}</h1>
          <p className="text-sm text-gray-500">
            Facilitator · {session.participants.length} participants · {session.activities.length} activities
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={session.status} />
          {next && (
            <button
              onClick={() => onStatusChange(next)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              → {STATUS_LABEL[next]}
            </button>
          )}
          <button
            onClick={onExport}
            className="border border-gray-200 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium text-gray-700"
          >
            Export CSV
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['yes', 'maybe', 'no'] as const).map(col => (
          <div key={col}>
            <h2 className={`text-sm font-semibold mb-3 ${colHeaders[col]}`}>
              Automatable: {col} ({grouped[col].length})
            </h2>
            <div className="flex flex-col gap-3">
              {grouped[col].map(activity => {
                const participant = session.participants.find(p => p.id === activity.participantId);
                return (
                  <div
                    key={activity.id}
                    className={`bg-white rounded-xl border p-4 ${activity.flaggedByFacilitator ? 'ring-2 ring-yellow-400 border-yellow-200' : 'border-gray-100'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-800 leading-snug">{activity.title}</p>
                      <button
                        onClick={() => onFlag(activity.id)}
                        className={`text-xl shrink-0 leading-none ${activity.flaggedByFacilitator ? 'text-yellow-500' : 'text-gray-200 hover:text-yellow-400'}`}
                        title="Flag activity"
                      >
                        ★
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <Chip>⏱ {activity.timeEstimate}</Chip>
                      <Chip>😊 {activity.enjoyment}</Chip>
                      <Chip>🔁 {activity.repetitive}</Chip>
                    </div>
                    <p className="text-xs text-gray-500">{participant?.name ?? 'Unknown'}</p>
                  </div>
                );
              })}
              {grouped[col].length === 0 && (
                <p className="text-sm text-gray-400 italic">No activities here yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Engineer view ──────────────────────────────────────────────────────────────

function EngineerView({ session, participantId, onAddActivity, onUpdateActivity, onDeleteActivity }: {
  session: Session;
  participantId: string;
  onAddActivity: (data: FormData) => void;
  onUpdateActivity: (id: string, data: FormData) => void;
  onDeleteActivity: (id: string) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isOpen = session.status === 'open';

  const myActivities = session.activities.filter(a => a.participantId === participantId);
  const othersActivities = session.activities.filter(a => a.participantId !== participantId);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{session.name}</h1>
          <p className="text-sm text-gray-500">
            {session.participants.length} participants · {session.activities.length} activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={session.status} />
          <div className="flex -space-x-1">
            {session.participants.slice(0, 5).map(p => (
              <div
                key={p.id}
                title={p.name}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ring-2 ring-white
                  ${p.id === participantId ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                {p.name[0].toUpperCase()}
              </div>
            ))}
            {session.participants.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 ring-2 ring-white">
                +{session.participants.length - 5}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-8 max-w-5xl w-full mx-auto">
        {/* My activities */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              My Activities ({myActivities.length})
            </h2>
            {isOpen && !showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                + Add Activity
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="mb-3">
              <ActivityForm
                formKey="new"
                onSubmit={data => { onAddActivity(data); setShowAddForm(false); }}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          )}

          {myActivities.length === 0 && !showAddForm ? (
            <p className="text-sm text-gray-400">
              {isOpen ? 'No activities yet — add one above.' : 'No activities submitted.'}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myActivities.map(activity =>
                editingId === activity.id ? (
                  <ActivityForm
                    key={activity.id}
                    formKey={activity.id}
                    initial={activity}
                    onSubmit={data => { onUpdateActivity(activity.id, data); setEditingId(null); }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    participantName="You"
                    isOwn
                    sessionOpen={isOpen}
                    onEdit={() => setEditingId(activity.id)}
                    onDelete={() => onDeleteActivity(activity.id)}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* Team activities */}
        {othersActivities.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Team Activities ({othersActivities.length})
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {othersActivities.map(activity => {
                const participant = session.participants.find(p => p.id === activity.participantId);
                return (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    participantName={participant?.name ?? 'Unknown'}
                    isOwn={false}
                    sessionOpen={isOpen}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// ── Join form ──────────────────────────────────────────────────────────────────

function JoinForm({ session, onJoin }: { session: Session; onJoin: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    setJoining(true);
    setError('');
    try {
      await onJoin(name.trim());
    } catch {
      setError('Failed to join. Please try again.');
      setJoining(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">{session.name}</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your name to join this session.</p>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-3
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          onClick={submit}
          disabled={!name.trim() || joining}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                     text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {joining ? 'Joining…' : 'Join Session'}
        </button>
      </div>
    </main>
  );
}

// ── Main session page ──────────────────────────────────────────────────────────

function SessionContent() {
  const { id: sessionId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const facilitatorToken = searchParams.get('facilitator');

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);

  const isFacilitator = Boolean(facilitatorToken);
  const isJoined = isFacilitator || Boolean(participantId);

  // Initial load
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.ok ? r.json() : Promise.reject('Session not found'))
      .then((s: Session) => setSession(s))
      .catch(() => setError('Session not found or expired.'))
      .finally(() => setLoading(false));

    const stored = localStorage.getItem(`participant:${sessionId}`);
    if (stored) setParticipantId(stored);
  }, [sessionId]);

  // Socket connection — set up once after joining
  useEffect(() => {
    if (!isJoined || !session) return;

    socket.connect();
    socket.emit('session:join', { sessionId, participantId: participantId ?? 'facilitator' });

    socket.on('participant:joined', (p: Participant) => {
      setSession(s => s ? { ...s, participants: [...s.participants.filter(x => x.id !== p.id), p] } : s);
    });
    socket.on('activity:added', (a: Activity) => {
      setSession(s => s ? { ...s, activities: [...s.activities, a] } : s);
    });
    socket.on('activity:updated', (a: Activity) => {
      setSession(s => s ? { ...s, activities: s.activities.map(x => x.id === a.id ? a : x) } : s);
    });
    socket.on('activity:deleted', (id: string) => {
      setSession(s => s ? { ...s, activities: s.activities.filter(x => x.id !== id) } : s);
    });
    socket.on('session:statusChanged', (status: Session['status']) => {
      setSession(s => s ? { ...s, status } : s);
    });
    socket.on('activity:flagged', ({ activityId, flagged }: { activityId: string; flagged: boolean }) => {
      setSession(s => s ? {
        ...s,
        activities: s.activities.map(a => a.id === activityId ? { ...a, flaggedByFacilitator: flagged } : a),
      } : s);
    });

    return () => {
      socket.off('participant:joined');
      socket.off('activity:added');
      socket.off('activity:updated');
      socket.off('activity:deleted');
      socket.off('session:statusChanged');
      socket.off('activity:flagged');
      socket.disconnect();
    };
  }, [isJoined, sessionId, participantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = useCallback(async (name: string) => {
    const r = await fetch(`/api/sessions/${sessionId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) throw new Error();
    const participant: Participant = await r.json();
    localStorage.setItem(`participant:${sessionId}`, participant.id);
    setParticipantId(participant.id);
    setSession(s => s ? { ...s, participants: [...s.participants, participant] } : s);
  }, [sessionId]);

  const handleAddActivity = useCallback((data: FormData) => {
    if (!participantId) return;
    socket.emit('activity:add', { sessionId, activity: { ...data, participantId } });
  }, [sessionId, participantId]);

  const handleUpdateActivity = useCallback((id: string, data: FormData) => {
    if (!participantId) return;
    socket.emit('activity:update', { sessionId, activityId: id, participantId, updates: data });
  }, [sessionId, participantId]);

  const handleDeleteActivity = useCallback((id: string) => {
    if (!participantId) return;
    socket.emit('activity:delete', { sessionId, activityId: id, participantId });
  }, [sessionId, participantId]);

  const handleStatusChange = useCallback((status: Session['status']) => {
    socket.emit('session:status', { sessionId, facilitatorToken, status });
  }, [sessionId, facilitatorToken]);

  const handleFlag = useCallback((activityId: string) => {
    socket.emit('activity:flag', { sessionId, facilitatorToken, activityId });
  }, [sessionId, facilitatorToken]);

  const handleExport = useCallback(() => {
    if (!session) return;
    const headers = ['ID', 'Participant', 'Title', 'Time Estimate', 'Enjoyment', 'Repetitive', 'Automatable', 'Flagged'];
    const rows = session.activities.map(a => {
      const p = session.participants.find(x => x.id === a.participantId);
      return [a.id, p?.name ?? 'Unknown', a.title, a.timeEstimate, a.enjoyment, a.repetitive, a.automatable, a.flaggedByFacilitator ? 'yes' : 'no'];
    });
    const csv = [headers, ...rows]
      .map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toil-tracker-${session.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [session]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium">{error || 'Session not found.'}</p>
          <a href="/" className="text-blue-600 text-sm mt-3 inline-block hover:underline">← Back to home</a>
        </div>
      </div>
    );
  }

  if (isFacilitator) {
    return (
      <FacilitatorView
        session={session}
        facilitatorToken={facilitatorToken!}
        onStatusChange={handleStatusChange}
        onFlag={handleFlag}
        onExport={handleExport}
      />
    );
  }

  if (!isJoined) {
    return <JoinForm session={session} onJoin={handleJoin} />;
  }

  return (
    <EngineerView
      session={session}
      participantId={participantId!}
      onAddActivity={handleAddActivity}
      onUpdateActivity={handleUpdateActivity}
      onDeleteActivity={handleDeleteActivity}
    />
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}>
      <SessionContent />
    </Suspense>
  );
}
