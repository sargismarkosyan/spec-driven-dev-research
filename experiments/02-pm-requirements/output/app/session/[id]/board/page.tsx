'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { socket } from '@/lib/socket';

type Activity = {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  tpo: string;
  frequency: string;
  energy: string;
  effortHrsPerWeek: number;
  autoVerdict: string | null;
  flagged: boolean;
};

type Session = {
  id: string;
  name: string;
  status: string;
  enabledCategories: string[];
  liveFeedEnabled: boolean;
  activities: Activity[];
};

const TPO_LABELS: Record<string, string> = {
  lt30: '< 30 min', '30to2h': '30m–2h', halfday: 'Half day', fullday: 'Full day',
};
const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', adhoc: 'Ad hoc',
};
const ENERGY_LABELS: Record<string, string> = {
  energizes: '⚡ Energizes', neutral: '😐 Neutral', drains: '🔋 Drains',
};
const ENERGY_COLORS: Record<string, string> = {
  energizes: 'text-green-700 bg-green-50', neutral: 'text-gray-600 bg-gray-50', drains: 'text-red-700 bg-red-50',
};

const PROMPT_EXAMPLES: Record<string, { label: string; examples: string[] }> = {
  yesterday: { label: 'Yesterday & this week', examples: ['Daily standup', 'Code review', 'PR reviews', 'Slack firefighting'] },
  meetings: { label: 'Weekly meetings', examples: ['Sprint planning', 'Retro', '1:1s', 'Team sync'] },
  rituals: { label: 'Monthly rituals', examples: ['Monthly reporting', 'Access reviews', 'Metrics review'] },
  oncall: { label: 'On-call & incidents', examples: ['On-call rotation', 'Incident response', 'Post-mortems'] },
  quarterly: { label: 'Quarterly cycles', examples: ['OKR planning', 'Perf reviews', 'Roadmap grooming'] },
  chores: { label: 'Manual chores', examples: ['Rotating secrets', 'Data exports', 'Manual deploys'] },
  handoffs: { label: 'Handoffs & coordination', examples: ['Cross-team syncs', 'Handoff docs', 'Status updates'] },
  automation: { label: 'Things I wish we automated', examples: ['Environment setup', 'Report generation', 'Test data seeding'] },
  other: { label: 'Other recurring work', examples: ['Customer calls', 'Support tickets', 'Vendor reviews'] },
};

const TPO_OPTIONS = [
  { value: 'lt30', label: 'Less than 30 minutes' },
  { value: '30to2h', label: '30 min – 2 hours' },
  { value: 'halfday', label: 'About half a day' },
  { value: 'fullday', label: 'A full day or more' },
];
const FREQ_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'adhoc', label: 'Ad hoc / irregular' },
];
const ENERGY_OPTIONS = [
  { value: 'energizes', label: 'Energizes me' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'drains', label: 'Drains me' },
];

function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
            value === o.value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-200 text-gray-700 hover:border-blue-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ActivityCard({ activity, onEdit, onDelete, isMine }: {
  activity: Activity;
  onEdit?: () => void;
  onDelete?: () => void;
  isMine?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 group">
      <p className="text-sm font-medium text-gray-800 mb-2">{activity.title}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {TPO_LABELS[activity.tpo]}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
          {FREQ_LABELS[activity.frequency]}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${ENERGY_COLORS[activity.energy]}`}>
          {ENERGY_LABELS[activity.energy]}
        </span>
      </div>
      <p className="text-xs text-gray-400">~{activity.effortHrsPerWeek}h/wk</p>
      {isMine && (
        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-xs text-blue-600 hover:underline">Edit</button>
          <button onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>
        </div>
      )}
      {!isMine && (
        <p className="text-xs text-gray-400 mt-1">{activity.authorName}</p>
      )}
    </div>
  );
}

type FormState = {
  title: string;
  tpo: string;
  frequency: string;
  energy: string;
};

const BLANK_FORM: FormState = { title: '', tpo: '', frequency: '', energy: '' };

export default function BoardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [myId, setMyId] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [myActivities, setMyActivities] = useState<Activity[]>([]);
  const [teamActivities, setTeamActivities] = useState<Activity[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const participantInfo = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(`participant_${sessionId}`) || '{}');
    } catch { return {}; }
  }, [sessionId]);

  useEffect(() => {
    const info = participantInfo();
    if (!info.name) { router.push(`/session/${sessionId}/join`); return; }

    socket.connect();
    setMyId(socket.id || '');

    socket.emit('session:join', {
      sessionId,
      name: info.name,
      role: info.role || 'IC',
    });

    socket.on('connect', () => setMyId(socket.id || ''));

    socket.on('session:state', (s: Session) => {
      setSession(s);
      const sid = socket.id || '';
      const mine = s.activities.filter((a) => a.authorId === sid);
      const team = s.activities.filter((a) => a.authorId !== sid);
      setMyActivities(mine);
      setTeamActivities(team);
    });

    socket.on('activity:added', (a: Activity) => {
      const sid = socket.id || '';
      if (a.authorId === sid) {
        setMyActivities((prev) => [...prev.filter((x) => x.id !== a.id), a]);
      } else {
        setTeamActivities((prev) => [...prev.filter((x) => x.id !== a.id), a]);
      }
    });

    socket.on('activity:updated', (a: Activity) => {
      const sid = socket.id || '';
      if (a.authorId === sid) {
        setMyActivities((prev) => prev.map((x) => x.id === a.id ? a : x));
      } else {
        setTeamActivities((prev) => prev.map((x) => x.id === a.id ? a : x));
      }
    });

    socket.on('activity:deleted', (id: string) => {
      setMyActivities((prev) => prev.filter((a) => a.id !== id));
      setTeamActivities((prev) => prev.filter((a) => a.id !== id));
    });

    return () => {
      socket.off('connect');
      socket.off('session:state');
      socket.off('activity:added');
      socket.off('activity:updated');
      socket.off('activity:deleted');
      socket.disconnect();
    };
  }, [sessionId, router, participantInfo]);

  const openNewForm = (prefillTitle = '') => {
    setEditingId(null);
    setForm({ ...BLANK_FORM, title: prefillTitle });
  };

  const openEditForm = (activity: Activity) => {
    setEditingId(activity.id);
    setForm({
      title: activity.title,
      tpo: activity.tpo,
      frequency: activity.frequency,
      energy: activity.energy,
    });
  };

  const submitForm = () => {
    if (!form || !form.title || !form.tpo || !form.frequency || !form.energy) return;
    if (editingId) {
      socket.emit('activity:edit', {
        sessionId,
        activityId: editingId,
        changes: { title: form.title, tpo: form.tpo, frequency: form.frequency, energy: form.energy },
      });
    } else {
      socket.emit('activity:add', {
        sessionId,
        title: form.title,
        tpo: form.tpo,
        frequency: form.frequency,
        energy: form.energy,
      });
    }
    setForm(null);
    setEditingId(null);
  };

  const deleteActivity = (id: string) => {
    socket.emit('activity:delete', { sessionId, activityId: id });
  };

  const sessionOpen = session?.status === 'open' || session?.status === 'lobby';
  const enabledCats = session?.enabledCategories ?? [];
  const liveFeedEnabled = session?.liveFeedEnabled ?? true;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-800">{session?.name || 'Toil Tracker'}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          session?.status === 'open' ? 'bg-green-100 text-green-700' :
          session?.status === 'reviewing' ? 'bg-amber-100 text-amber-700' :
          'bg-gray-100 text-gray-500'
        }`}>
          {session?.status || 'lobby'}
        </span>
        <span className="text-xs text-gray-400 ml-auto">{participantInfo().name}</span>
      </header>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Prompt rail */}
        <aside className="w-56 bg-white border-r border-gray-100 overflow-y-auto p-3 hidden md:block">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Prompts</p>
          <div className="flex flex-col gap-1">
            {enabledCats.map((cat) => {
              const info = PROMPT_EXAMPLES[cat];
              if (!info) return null;
              return (
                <div key={cat}>
                  <button
                    onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    {info.label}
                    <span className="text-gray-400">{expandedCat === cat ? '▲' : '▼'}</span>
                  </button>
                  {expandedCat === cat && (
                    <div className="ml-3 flex flex-col gap-0.5 mb-1">
                      {info.examples.map((ex) => (
                        <button
                          key={ex}
                          onClick={() => openNewForm(ex)}
                          className="text-left text-xs text-blue-600 hover:underline py-0.5 px-2"
                        >
                          + {ex}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center: My activities */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700">My activities <span className="text-gray-400 font-normal">({myActivities.length})</span></p>
            {sessionOpen && (
              <button
                onClick={() => openNewForm()}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Add activity
              </button>
            )}
          </div>

          {/* Inline form */}
          {form !== null && (
            <div className="bg-white rounded-xl border-2 border-blue-200 p-4 mb-4 flex flex-col gap-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {editingId ? 'Edit activity' : 'New activity'}
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">What do you do?</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Activity title"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">1. Time per occurrence</label>
                <SegmentedControl
                  options={TPO_OPTIONS}
                  value={form.tpo}
                  onChange={(v) => setForm({ ...form, tpo: v })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">2. Frequency</label>
                <SegmentedControl
                  options={FREQ_OPTIONS}
                  value={form.frequency}
                  onChange={(v) => setForm({ ...form, frequency: v })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">3. Energy</label>
                <SegmentedControl
                  options={ENERGY_OPTIONS}
                  value={form.energy}
                  onChange={(v) => setForm({ ...form, energy: v })}
                />
              </div>

              <p className="text-xs text-gray-400 italic">Automatable? Not asked here — the team decides together.</p>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setForm(null); setEditingId(null); }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={submitForm}
                  disabled={!form.title || !form.tpo || !form.frequency || !form.energy}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40"
                >
                  {editingId ? 'Save' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {myActivities.length === 0 && form === null && (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p>No activities yet.</p>
              {sessionOpen && <p className="mt-1">Click "+ Add activity" to start.</p>}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {myActivities.map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                isMine={sessionOpen}
                onEdit={() => openEditForm(a)}
                onDelete={() => deleteActivity(a.id)}
              />
            ))}
          </div>
        </main>

        {/* Right: Team feed */}
        {liveFeedEnabled && (
          <aside className="w-64 bg-white border-l border-gray-100 overflow-y-auto p-3 hidden lg:block">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Team feed</p>
            {teamActivities.length === 0 ? (
              <p className="text-xs text-gray-400">Waiting for teammates…</p>
            ) : (
              <div className="flex flex-col gap-2">
                {teamActivities.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => openNewForm(a.title)}
                    className="bg-gray-50 rounded-xl border border-gray-100 p-3 cursor-pointer hover:border-blue-200 transition-colors"
                  >
                    <p className="text-xs font-medium text-gray-700 mb-1">{a.title}</p>
                    <div className="flex flex-wrap gap-1 mb-1">
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        {TPO_LABELS[a.tpo]}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">
                        {FREQ_LABELS[a.frequency]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{a.authorName}</p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
