'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { socket } from '@/lib/socket';

type Role = 'engineer' | 'facilitator';
type Frequency = 'daily' | 'weekly' | 'monthly' | 'occasional';

type Session = {
  id: string;
  name: string;
  status: 'open' | 'closed';
  createdAt: string;
};

type Participant = {
  socketId: string;
  name: string;
  role: Role;
};

type Activity = {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  description: string;
  category: string;
  frequency: Frequency;
  minutesPerOccurrence: number;
  painLevel: number;
  flagged: boolean;
  createdAt: string;
};

const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'occasional'];

const WEEKLY_MINUTES: Record<Frequency, number> = {
  daily: 5,
  weekly: 1,
  monthly: 0.25,
  occasional: 0.1,
};

function weeklyMinutes(a: Activity) {
  return a.minutesPerOccurrence * (WEEKLY_MINUTES[a.frequency] ?? 0);
}

function PainDots({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= level ? 'bg-red-400' : 'bg-gray-200'
          }`}
        />
      ))}
    </span>
  );
}

function ActivityCard({
  activity,
  isFacilitator,
  onFlag,
}: {
  activity: Activity;
  isFacilitator: boolean;
  onFlag?: (id: string) => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-2 ${
        activity.flagged ? 'border-purple-300 bg-purple-50' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-800 font-medium leading-snug">{activity.description}</p>
        {isFacilitator && onFlag && (
          <button
            onClick={() => onFlag(activity.id)}
            title={activity.flagged ? 'Unflag' : 'Flag as priority'}
            className={`shrink-0 text-xs rounded-full px-2 py-0.5 font-medium transition-colors ${
              activity.flagged
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-700'
            }`}
          >
            {activity.flagged ? 'Flagged' : 'Flag'}
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="bg-gray-100 rounded px-2 py-0.5">{activity.category}</span>
        <span>{activity.frequency}</span>
        <span>{activity.minutesPerOccurrence} min</span>
        <PainDots level={activity.painLevel} />
      </div>
      <p className="text-xs text-gray-400">{activity.authorName}</p>
    </div>
  );
}

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [myRole, setMyRole] = useState<Role>('engineer');
  const [myName, setMyName] = useState('');
  const [copyDone, setCopyDone] = useState(false);

  // Activity form state
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [minutes, setMinutes] = useState('');
  const [painLevel, setPainLevel] = useState(3);
  const [formError, setFormError] = useState('');

  // Facilitator sort
  const [sortBy, setSortBy] = useState<'painLevel' | 'weeklyMinutes' | 'createdAt'>('painLevel');
  const [filterFlagged, setFilterFlagged] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('userName');
    const role = (localStorage.getItem('userRole') as Role) || 'engineer';
    if (!name) { router.push('/'); return; }
    setMyName(name);
    setMyRole(role);

    socket.connect();
    socket.emit('session:join', { sessionId, name, role });

    socket.on('session:state', (s: { session: Session; participants: Participant[]; activities: Activity[] }) => {
      setSession(s.session);
      setParticipants(s.participants);
      setActivities(s.activities);
    });
    socket.on('participant:joined', (p: Participant) => {
      setParticipants((prev) => [...prev.filter((x) => x.socketId !== p.socketId), p]);
    });
    socket.on('participant:left', (socketId: string) => {
      setParticipants((prev) => prev.filter((x) => x.socketId !== socketId));
    });
    socket.on('activity:added', (a: Activity) => {
      setActivities((prev) => [...prev, a]);
    });
    socket.on('activity:flagged', ({ activityId, flagged }: { activityId: string; flagged: boolean }) => {
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, flagged } : a))
      );
    });
    socket.on('session:closed', () => {
      setSession((prev) => prev ? { ...prev, status: 'closed' } : prev);
    });

    return () => {
      socket.off('session:state');
      socket.off('participant:joined');
      socket.off('participant:left');
      socket.off('activity:added');
      socket.off('activity:flagged');
      socket.off('session:closed');
      socket.disconnect();
    };
  }, [router, sessionId]);

  const submitActivity = () => {
    const mins = parseInt(minutes, 10);
    if (!description.trim()) { setFormError('Description is required.'); return; }
    if (!category.trim()) { setFormError('Category is required.'); return; }
    if (!minutes || isNaN(mins) || mins < 1) { setFormError('Enter a valid number of minutes.'); return; }
    setFormError('');
    socket.emit('activity:add', {
      sessionId,
      description: description.trim(),
      category: category.trim(),
      frequency,
      minutesPerOccurrence: mins,
      painLevel,
    });
    setDescription('');
    setCategory('');
    setMinutes('');
    setPainLevel(3);
  };

  const flagActivity = useCallback((activityId: string) => {
    socket.emit('activity:flag', { activityId });
  }, []);

  const closeSession = () => {
    socket.emit('session:close', { sessionId });
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const sortedActivities = [...activities]
    .filter((a) => (filterFlagged ? a.flagged : true))
    .sort((a, b) => {
      if (sortBy === 'weeklyMinutes') return weeklyMinutes(b) - weeklyMinutes(a);
      if (sortBy === 'painLevel') return b.painLevel - a.painLevel;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const myActivities = activities.filter((a) => a.authorName === myName);

  const totalWeeklyMins = activities.reduce((sum, a) => sum + weeklyMinutes(a), 0);
  const flaggedCount = activities.filter((a) => a.flagged).length;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        Loading session…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 p-4 flex flex-col gap-4 shrink-0">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Session</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{session.name}</p>
          <span
            className={`inline-block mt-1 text-xs rounded-full px-2 py-0.5 font-medium ${
              session.status === 'open'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {session.status}
          </span>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Session ID</p>
          <button
            onClick={copySessionId}
            className="text-xs font-mono text-blue-600 hover:underline break-all text-left"
          >
            {copyDone ? 'Copied!' : sessionId}
          </button>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Participants ({participants.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {participants.map((p) => (
              <li key={p.socketId} className="flex items-center gap-1.5 text-xs text-gray-700">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    p.role === 'facilitator' ? 'bg-purple-400' : 'bg-green-400'
                  }`}
                />
                <span className="truncate">{p.name}</span>
                <span className="ml-auto text-gray-300">{p.role === 'facilitator' ? 'F' : 'E'}</span>
              </li>
            ))}
          </ul>
        </div>

        {myRole === 'facilitator' && session.status === 'open' && (
          <button
            onClick={closeSession}
            className="mt-auto text-xs text-red-500 hover:text-red-700 transition-colors text-left"
          >
            Close session
          </button>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto">
        {myRole === 'engineer' && (
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Log your toil</h2>
              <p className="text-sm text-gray-500">
                Describe repetitive or manual work you do regularly. Be honest — this is how
                the team finds what to fix.
              </p>
            </div>

            {session.status === 'closed' ? (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-500">
                This session has been closed. No more activities can be added.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    What do you do? <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="e.g. Manually restart the ingestion pipeline after every deploy"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. deployments, on-call"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as Frequency)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Minutes per occurrence <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Pain level: {painLevel}/5
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={painLevel}
                      onChange={(e) => setPainLevel(Number(e.target.value))}
                      className="w-full mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>Minor</span>
                      <span>Severe</span>
                    </div>
                  </div>
                </div>

                {formError && <p className="text-xs text-red-500">{formError}</p>}

                <button
                  onClick={submitActivity}
                  className="self-end bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5
                             text-sm font-medium transition-colors"
                >
                  Add activity
                </button>
              </div>
            )}

            {myActivities.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Your activities ({myActivities.length})
                </h3>
                <div className="flex flex-col gap-3">
                  {myActivities.map((a) => (
                    <ActivityCard key={a.id} activity={a} isFacilitator={false} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {myRole === 'facilitator' && (
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Facilitator view</h2>
              <p className="text-sm text-gray-500">
                Review all toil submitted by the team. Flag items that are low-effort to fix and
                high-value to the team.
              </p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-2xl font-bold text-gray-800">{activities.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Activities logged</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-2xl font-bold text-gray-800">
                  {Math.round(totalWeeklyMins)}
                  <span className="text-sm font-normal text-gray-400 ml-1">min/wk</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Estimated weekly toil</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-2xl font-bold text-purple-600">{flaggedCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Flagged for action</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">Sort by:</span>
              {(['painLevel', 'weeklyMinutes', 'createdAt'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`text-xs rounded-full px-3 py-1 transition-colors ${
                    sortBy === s
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s === 'painLevel' ? 'Pain level' : s === 'weeklyMinutes' ? 'Weekly cost' : 'Recent'}
                </button>
              ))}
              <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterFlagged}
                  onChange={(e) => setFilterFlagged(e.target.checked)}
                  className="rounded"
                />
                Flagged only
              </label>
            </div>

            {sortedActivities.length === 0 ? (
              <p className="text-sm text-gray-400">
                {filterFlagged
                  ? 'No flagged activities yet.'
                  : 'Waiting for engineers to submit activities…'}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedActivities.map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    isFacilitator
                    onFlag={flagActivity}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
