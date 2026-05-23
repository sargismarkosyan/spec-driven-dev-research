'use client';

import { useEffect, useState, useCallback } from 'react';
import { socket } from '@/lib/socket';

type Duration = 'quick' | 'medium' | 'significant';
type Enjoyment = 'yes' | 'meh' | 'no';
type Repetitive = 'yes' | 'sometimes' | 'no';
type Automatable = 'yes' | 'maybe' | 'no';
type Priority = 'high' | 'medium' | 'low';

type Activity = {
  id: string;
  authorName: string;
  title: string;
  duration: Duration;
  enjoyment: Enjoyment;
  repetitive: Repetitive;
  automatable: Automatable;
  priority?: Priority;
  flagged: boolean;
};

type Participant = { id: string; name: string };
type SessionState = {
  id: string;
  title: string;
  status: 'open' | 'reviewing' | 'closed';
  participants: Participant[];
  activities: Activity[];
};

const DURATION_OPTS: { value: Duration; label: string }[] = [
  { value: 'quick', label: 'Quick' },
  { value: 'medium', label: 'Medium' },
  { value: 'significant', label: 'Significant' },
];
const ENJOYMENT_OPTS: { value: Enjoyment; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'meh', label: 'Meh' },
  { value: 'no', label: 'No' },
];
const REPETITIVE_OPTS: { value: Repetitive; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'no', label: 'No' },
];
const AUTOMATABLE_OPTS: { value: Automatable; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
];

const AUTOMATABLE_COLORS: Record<Automatable, string> = {
  yes: 'bg-green-100 text-green-700',
  maybe: 'bg-yellow-100 text-yellow-700',
  no: 'bg-gray-100 text-gray-500',
};
const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-blue-100 text-blue-700',
};

function PillSelect<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
      <div className="flex gap-1">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              value === o.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SessionPage({ params }: { params: { id: string } }) {
  const sessionId = params.id;

  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<Duration>('quick');
  const [enjoyment, setEnjoyment] = useState<Enjoyment>('meh');
  const [repetitive, setRepetitive] = useState<Repetitive>('sometimes');
  const [automatable, setAutomatable] = useState<Automatable>('maybe');

  const updateActivity = useCallback((updated: Activity) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, activities: prev.activities.map(a => a.id === updated.id ? updated : a) };
    });
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem(`session:${sessionId}:name`);
    if (savedName) setName(savedName);
  }, [sessionId]);

  useEffect(() => {
    if (!joined) return;

    socket.connect();
    socket.emit('session:join', { sessionId, name });

    socket.on('session:state', (s: SessionState) => setSession(s));
    socket.on('session:error', (msg: string) => setError(msg));
    socket.on('session:participant:joined', (p: Participant) => {
      setSession(prev => prev ? { ...prev, participants: [...prev.participants.filter(x => x.id !== p.id), p] } : prev);
    });
    socket.on('session:participant:left', (id: string) => {
      setSession(prev => prev ? { ...prev, participants: prev.participants.filter(p => p.id !== id) } : prev);
    });
    socket.on('activity:added', (a: Activity) => {
      setSession(prev => prev ? { ...prev, activities: [...prev.activities, a] } : prev);
    });
    socket.on('activity:updated', updateActivity);
    socket.on('session:updated', ({ status }: { status: SessionState['status'] }) => {
      setSession(prev => prev ? { ...prev, status } : prev);
    });

    return () => {
      socket.off('session:state');
      socket.off('session:error');
      socket.off('session:participant:joined');
      socket.off('session:participant:left');
      socket.off('activity:added');
      socket.off('activity:updated');
      socket.off('session:updated');
      socket.disconnect();
    };
  }, [joined, sessionId, name, updateActivity]);

  const handleJoin = () => {
    if (!name.trim()) return;
    localStorage.setItem(`session:${sessionId}:name`, name.trim());
    setJoined(true);
  };

  const submitActivity = () => {
    if (!title.trim()) return;
    socket.emit('activity:add', { sessionId, title: title.trim(), duration, enjoyment, repetitive, automatable });
    setTitle('');
    setDuration('quick');
    setEnjoyment('meh');
    setRepetitive('sometimes');
    setAutomatable('maybe');
  };

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <a href="/" className="text-sm text-blue-600 mt-2 inline-block">Back to home</a>
        </div>
      </main>
    );
  }

  if (!joined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <h1 className="text-2xl font-semibold mb-1">Join Session</h1>
          <p className="text-gray-500 text-sm mb-6">Enter your name to join the work audit.</p>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleJoin}
            disabled={!name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                       text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-52 bg-white border-r border-gray-100 p-4 flex flex-col shrink-0">
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-900 truncate">{session?.title ?? '…'}</p>
          <StatusBadge status={session?.status ?? 'open'} />
        </div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
          Participants ({session?.participants.length ?? 0})
        </p>
        <ul className="flex flex-col gap-2">
          {session?.participants.map(p => (
            <li key={p.id} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              {p.name}
            </li>
          ))}
        </ul>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        {/* Activity form */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Add a recurring activity</h2>
          <input
            type="text"
            placeholder="What do you do regularly? (e.g. deploy releases, triage tickets)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitActivity()}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="space-y-2 mb-4">
            <PillSelect label="How long?" options={DURATION_OPTS} value={duration} onChange={setDuration} />
            <PillSelect label="Enjoy it?" options={ENJOYMENT_OPTS} value={enjoyment} onChange={setEnjoyment} />
            <PillSelect label="Repetitive?" options={REPETITIVE_OPTS} value={repetitive} onChange={setRepetitive} />
            <PillSelect label="Automatable?" options={AUTOMATABLE_OPTS} value={automatable} onChange={setAutomatable} />
          </div>
          <button
            onClick={submitActivity}
            disabled={!title.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm
                       font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Activity
          </button>
        </div>

        {/* Activity cards */}
        {session && session.activities.length === 0 ? (
          <p className="text-sm text-gray-400">No activities yet. Add yours above!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {session?.activities.map(a => (
              <div
                key={a.id}
                className={`bg-white rounded-xl border shadow-sm p-4 ${a.flagged ? 'border-orange-300' : 'border-gray-100'}`}
              >
                <p className="text-sm font-medium text-gray-800 mb-2">{a.title}</p>
                <p className="text-xs text-gray-400 mb-3">{a.authorName}</p>
                <div className="flex flex-wrap gap-1">
                  <Tag label={a.duration} color="bg-gray-100 text-gray-600" />
                  <Tag label={`enjoy: ${a.enjoyment}`} color="bg-gray-100 text-gray-600" />
                  <Tag label={`rep: ${a.repetitive}`} color="bg-gray-100 text-gray-600" />
                  <Tag label={`auto: ${a.automatable}`} color={AUTOMATABLE_COLORS[a.automatable]} />
                  {a.priority && <Tag label={a.priority} color={PRIORITY_COLORS[a.priority]} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    reviewing: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? colors.open}`}>
      {status}
    </span>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>
  );
}
