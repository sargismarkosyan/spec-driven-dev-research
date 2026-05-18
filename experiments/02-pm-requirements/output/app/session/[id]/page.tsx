'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';

type Session = { id: string; name: string };
type User = { id: string; name: string };
type Activity = {
  id: string;
  authorName: string;
  title: string;
  timeEstimate: string;
  enjoyment: string;
  repetitiveness: string;
  automationPotential: string;
  flagged: boolean;
};

const TIME_OPTS = ['quick', 'medium', 'significant'] as const;
const ENJOY_OPTS = ['yes', 'meh', 'no'] as const;
const REPEAT_OPTS = ['yes', 'sometimes', 'no'] as const;
const AUTO_OPTS = ['yes', 'maybe', 'no'] as const;

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [name, setName] = useState('');
  const [nameInput, setNameInput] = useState('');

  const [title, setTitle] = useState('');
  const [timeEstimate, setTimeEstimate] = useState('quick');
  const [enjoyment, setEnjoyment] = useState('yes');
  const [repetitiveness, setRepetitiveness] = useState('yes');
  const [automationPotential, setAutomationPotential] = useState('maybe');

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) { setNotFound(true); return; }
        setSession(data.session);
        setActivities(data.activities);
        setUsers(data.users);
      });

    const stored = localStorage.getItem(`toil-name-${id}`);
    if (stored) setName(stored);
  }, [id]);

  useEffect(() => {
    if (!session || !name) return;

    socket.connect();
    socket.emit('session:join', { sessionId: id, name });

    socket.on('session:state', (s: { session: Session; users: User[]; activities: Activity[] }) => {
      setUsers(s.users);
      setActivities(s.activities);
    });
    socket.on('user:joined', (user: User) => {
      setUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
    });
    socket.on('user:left', (userId: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    });
    socket.on('activity:added', (activity: Activity) => {
      setActivities((prev) => [...prev, activity]);
    });
    socket.on('activity:flagged', ({ activityId, flagged }: { activityId: string; flagged: boolean }) => {
      setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, flagged } : a)));
    });

    return () => {
      socket.off('session:state');
      socket.off('user:joined');
      socket.off('user:left');
      socket.off('activity:added');
      socket.off('activity:flagged');
      socket.disconnect();
    };
  }, [session, name, id]);

  const joinSession = () => {
    if (!nameInput.trim()) return;
    const n = nameInput.trim();
    localStorage.setItem(`toil-name-${id}`, n);
    setName(n);
  };

  const addActivity = () => {
    if (!title.trim() || !name) return;
    socket.emit('activity:add', { sessionId: id, title: title.trim(), timeEstimate, enjoyment, repetitiveness, automationPotential });
    setTitle('');
  };

  if (notFound) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500">Session not found.</p>
        <button onClick={() => router.push('/')} className="mt-4 text-blue-600 text-sm hover:underline">
          Back to home
        </button>
      </div>
    </main>
  );

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  );

  if (!name) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">{session.name}</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your name to join this session.</p>
        <input
          type="text"
          placeholder="Your name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && joinSession()}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={joinSession}
          disabled={!nameInput.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                     text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Join Session
        </button>
      </div>
    </main>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="w-52 bg-white border-r border-gray-100 p-4 flex flex-col shrink-0">
        <p className="text-xs font-semibold text-gray-700 mb-0.5 truncate">{session.name}</p>
        <p className="text-xs text-gray-400 mb-4">Joined as {name}</p>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Online ({users.length})
        </p>
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              {u.name}
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 p-6 flex flex-col gap-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Add an activity</p>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="What did you do? (e.g. Triage incoming Jira tickets)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addActivity()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="grid grid-cols-2 gap-3">
              <Select label="Time estimate" value={timeEstimate} onChange={setTimeEstimate} opts={TIME_OPTS} />
              <Select label="Do you enjoy it?" value={enjoyment} onChange={setEnjoyment} opts={ENJOY_OPTS} />
              <Select label="Repetitive?" value={repetitiveness} onChange={setRepetitiveness} opts={REPEAT_OPTS} />
              <Select label="Automation potential?" value={automationPotential} onChange={setAutomationPotential} opts={AUTO_OPTS} />
            </div>

            <button
              onClick={addActivity}
              disabled={!title.trim()}
              className="self-end bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5
                         text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add Activity
            </button>
          </div>
        </div>

        {activities.length === 0 ? (
          <p className="text-sm text-gray-400">No activities yet. Add yours above.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
            </p>
            {activities.map((a) => (
              <div
                key={a.id}
                className={`bg-white rounded-xl border shadow-sm p-4 ${a.flagged ? 'border-amber-300' : 'border-gray-100'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.authorName}</p>
                  </div>
                  {a.flagged && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                      Flagged
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Tag label="Time" value={a.timeEstimate} />
                  <Tag label="Enjoy" value={a.enjoyment} />
                  <Tag label="Repeat" value={a.repetitiveness} />
                  <Tag label="Auto" value={a.automationPotential} highlight={a.automationPotential === 'yes'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Select({ label, value, onChange, opts }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opts: readonly string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Tag({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      highlight ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {label}: {value}
    </span>
  );
}
