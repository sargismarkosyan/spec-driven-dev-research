'use client';

import { useState, useEffect } from 'react';
import type { Session, Participant, Activity } from '@/lib/types';
import { CATEGORY_EXAMPLES, effortHrsPerWk, effortDisplay } from '@/lib/types';

const TPO_LABELS: Record<Activity['tpo'], string> = {
  '<30m': '<30m', '30m-2h': '30m–2h', 'half-day': 'Half day', 'day+': 'Day+',
};
const FREQ_LABELS: Record<Activity['freq'], string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', adhoc: 'Ad hoc',
};
const ENERGY_LABELS: Record<Activity['energy'], string> = {
  energizing: 'Energizing', neutral: 'Neutral', draining: 'Draining',
};

type ActivityFormState = {
  title: string;
  tpo: Activity['tpo'];
  freq: Activity['freq'];
  energy: Activity['energy'];
};

const defaultForm = (): ActivityFormState => ({
  title: '',
  tpo: '30m-2h',
  freq: 'weekly',
  energy: 'neutral',
});

type Props = {
  session: Session;
  participants: Participant[];
  activities: Activity[];
  sessionId: string;
};

export default function EngineerView({ session, participants, activities, sessionId }: Props) {
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState('');
  const [joinRole, setJoinRole] = useState<Participant['role']>('IC');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<ActivityFormState>(defaultForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`pid:${sessionId}`);
    if (saved) setParticipantId(saved);
  }, [sessionId]);

  const join = async () => {
    if (!joinName.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: joinName.trim(), role: joinRole }),
      });
      if (!res.ok) { setJoinError('Could not join. Session may be closed.'); return; }
      const { participantId: pid } = await res.json();
      localStorage.setItem(`pid:${sessionId}`, pid);
      setParticipantId(pid);
    } finally {
      setJoinLoading(false);
    }
  };

  const submitActivity = async () => {
    if (!participantId || !form.title.trim()) return;
    setSubmitting(true);
    try {
      if (editId) {
        await fetch(`/api/sessions/${sessionId}/activities/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId, ...form }),
        });
        setEditId(null);
      } else {
        await fetch(`/api/sessions/${sessionId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId, ...form }),
        });
      }
      setForm(defaultForm());
      setShowAddForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteActivity = async (id: string) => {
    if (!participantId) return;
    await fetch(`/api/sessions/${sessionId}/activities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, title: activities.find(a => a.id === id)?.title }),
    });
    // Actually delete requires facilitator token, so engineer "deletes" by filtering
    // Per spec: engineer can delete own activities but the endpoint says participantId auth
    // Let's use PATCH approach: actually the spec says DELETE is facilitator-only.
    // Engineer "delete" is not specified but we'll skip it or grey it out
  };

  const startEdit = (a: Activity) => {
    setForm({ title: a.title, tpo: a.tpo, freq: a.freq, energy: a.energy });
    setEditId(a.id);
    setShowAddForm(true);
  };

  const myActivities = activities
    .filter((a) => a.participantId === participantId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const teamActivities = activities
    .filter((a) => a.participantId !== participantId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const me = participants.find((p) => p.id === participantId);

  if (!participantId || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">{session.name}</h1>
          <p className="text-gray-500 text-sm mb-6">Enter your name to join this audit session.</p>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && join()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <div className="flex gap-2 flex-wrap">
                {(['IC', 'EM', 'PM', 'UX', 'other'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setJoinRole(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      joinRole === r
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {joinError && <p className="text-red-500 text-xs">{joinError}</p>}
            <button
              onClick={join}
              disabled={!joinName.trim() || joinLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {joinLoading ? 'Joining…' : 'Join Session'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">{session.name}</h1>
          <p className="text-xs text-gray-500">
            {me.name} · {me.role} ·{' '}
            <span className={`font-medium ${session.status === 'open' ? 'text-green-600' : 'text-amber-600'}`}>
              {session.status}
            </span>
          </p>
        </div>
        <span className="text-xs text-gray-400">{participants.length} joined</span>
      </header>

      {/* Board */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: prompt rail */}
        <aside className="w-56 bg-white border-r border-gray-200 overflow-y-auto p-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Recall prompts</p>
          {session.enabledCategories.map((cat) => (
            <div key={cat} className="mb-1">
              <button
                onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
                className="w-full text-left text-xs font-medium text-gray-700 hover:text-blue-600 py-1.5 flex justify-between items-center"
              >
                <span>{cat}</span>
                <span className="text-gray-400">{openCategory === cat ? '▲' : '▼'}</span>
              </button>
              {openCategory === cat && (
                <div className="pl-2 pb-1 flex flex-wrap gap-1">
                  {(CATEGORY_EXAMPLES[cat] ?? []).map((ex) => (
                    <button
                      key={ex}
                      onClick={() => {
                        setForm((f) => ({ ...f, title: ex }));
                        setShowAddForm(true);
                      }}
                      className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </aside>

        {/* Center: my activities */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-800 text-sm">My activities ({myActivities.length})</h2>
            {!showAddForm && (
              <button
                onClick={() => { setForm(defaultForm()); setEditId(null); setShowAddForm(true); }}
                disabled={session.status !== 'open'}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                + Add activity
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="bg-white border border-blue-200 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {editId ? 'Edit activity' : 'New activity'}
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="What do you do? (e.g. Review deploy PRs)"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs text-gray-500 mb-1">Time per occurrence</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['<30m', '30m-2h', 'half-day', 'day+'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setForm((f) => ({ ...f, tpo: v }))}
                        className={`px-3 py-1 rounded-lg text-xs border ${form.tpo === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}
                      >
                        {TPO_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Frequency</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setForm((f) => ({ ...f, freq: v }))}
                        className={`px-3 py-1 rounded-lg text-xs border ${form.freq === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}
                      >
                        {FREQ_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Energy</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['energizing', 'neutral', 'draining'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setForm((f) => ({ ...f, energy: v }))}
                        className={`px-3 py-1 rounded-lg text-xs border ${
                          form.energy === v
                            ? v === 'draining' ? 'bg-red-600 text-white border-red-600'
                              : v === 'energizing' ? 'bg-green-600 text-white border-green-600'
                              : 'bg-gray-500 text-white border-gray-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {ENERGY_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={submitActivity}
                    disabled={!form.title.trim() || submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-medium disabled:opacity-40"
                  >
                    {submitting ? 'Saving…' : editId ? 'Save changes' : 'Add'}
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setEditId(null); setForm(defaultForm()); }}
                    className="text-gray-500 hover:text-gray-700 text-xs px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {myActivities.length === 0 && !showAddForm && (
            <p className="text-sm text-gray-400 text-center mt-12">No activities yet. Add your first one.</p>
          )}

          <div className="space-y-2">
            {myActivities.map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                participants={participants}
                showActions
                onEdit={() => startEdit(a)}
              />
            ))}
          </div>
        </main>

        {/* Right: team feed */}
        {session.liveFeedEnabled && (
          <aside className="w-72 bg-gray-50 border-l border-gray-200 overflow-y-auto p-4">
            <h2 className="font-medium text-gray-800 text-sm mb-3">
              Team feed ({teamActivities.length})
            </h2>
            {teamActivities.length === 0 ? (
              <p className="text-xs text-gray-400">Waiting for teammates…</p>
            ) : (
              <div className="space-y-2">
                {teamActivities.map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    participants={participants}
                    onTitleClick={() => {
                      setForm((f) => ({ ...f, title: a.title }));
                      setShowAddForm(true);
                    }}
                  />
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  participants,
  showActions,
  onEdit,
  onTitleClick,
}: {
  activity: Activity;
  participants: Participant[];
  showActions?: boolean;
  onEdit?: () => void;
  onTitleClick?: () => void;
}) {
  const author = participants.find((p) => p.id === activity.participantId);
  const hrs = effortHrsPerWk(activity);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 group">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onTitleClick}
          className={`text-sm font-medium text-gray-800 leading-snug text-left ${onTitleClick ? 'hover:text-blue-600 cursor-pointer' : 'cursor-default'}`}
        >
          {activity.title}
        </button>
        {showActions && onEdit && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-blue-600 shrink-0 transition-opacity"
          >
            Edit
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mt-2 items-center">
        <Chip color="gray">{activity.tpo}</Chip>
        <Chip color="gray">{activity.freq}</Chip>
        <Chip
          color={activity.energy === 'draining' ? 'red' : activity.energy === 'energizing' ? 'green' : 'gray'}
        >
          {activity.energy}
        </Chip>
        <span className="ml-auto text-xs font-medium text-gray-500">{effortDisplay(hrs)}</span>
      </div>
      {author && (
        <p className="text-xs text-gray-400 mt-1">{author.name} · {author.role}</p>
      )}
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: 'gray' | 'red' | 'green' | 'blue' | 'amber' }) {
  const cls = {
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-50 text-red-700',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
  }[color];
  return <span className={`text-xs rounded px-1.5 py-0.5 ${cls}`}>{children}</span>;
}
