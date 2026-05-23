'use client';

import { useEffect, useState, useCallback, useRef, KeyboardEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';

// ── Types ──────────────────────────────────────────────────────────────────

type ParticipantRole = 'IC' | 'EM' | 'PM' | 'UX' | 'Other';
type SessionPhase = 'lobby' | 'submission' | 'discussion' | 'closed';
type TimePerOccurrence = '<30min' | '30min-2hr' | 'half-day' | 'full-day';
type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ad-hoc';
type EnergyLevel = 'energizes' | 'neutral' | 'drains';
type AutomatabilityVerdict = 'yes' | 'maybe' | 'no';

type Participant = {
  id: string;
  name: string;
  role: ParticipantRole;
  joinedAt: string;
  isOnline: boolean;
};

type AuditEntry = {
  timestamp: string;
  editorName: string;
  field: string;
  from: string;
  to: string;
};

type Activity = {
  id: string;
  authorId: string;
  authorName: string;
  coAuthors: { id: string; name: string }[];
  title: string;
  timePerOccurrence: TimePerOccurrence;
  frequency: Frequency;
  energy: EnergyLevel;
  automatability: AutomatabilityVerdict | null;
  facilitatorNote: string;
  flagged: boolean;
  skipped: boolean;
  mergedFrom: string[];
  relatedTo: string[];
  auditLog: AuditEntry[];
  createdAt: string;
  discussedAt: string | null;
};

type Session = {
  id: string;
  name: string;
  facilitatorId: string;
  facilitatorName: string;
  phase: SessionPhase;
  submissionWindowMinutes: number | null;
  submissionStartedAt: string | null;
  showTeamFeedToEngineers: boolean;
  enabledPromptCategoryIds: string[];
  participants: Participant[];
  activities: Activity[];
  discussionOrder: string[];
  discussionIndex: number;
};

type LocalInfo = {
  participantId: string;
  name: string;
  role: ParticipantRole | null;
  isFacilitator: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const TIME_LABELS: Record<TimePerOccurrence, string> = {
  '<30min': '< 30 min',
  '30min-2hr': '30 min – 2 hrs',
  'half-day': 'About half a day',
  'full-day': 'A full day or more',
};
const FREQ_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'ad-hoc': 'Ad hoc / irregular',
};
const ENERGY_LABELS: Record<EnergyLevel, string> = {
  energizes: 'Energizes me',
  neutral: 'Neutral',
  drains: 'Drains me',
};
const ENERGY_COLORS: Record<EnergyLevel, string> = {
  energizes: 'bg-green-50 border-green-200 text-green-800',
  neutral: 'bg-gray-50 border-gray-200 text-gray-700',
  drains: 'bg-red-50 border-red-200 text-red-800',
};
const VERDICT_COLORS: Record<AutomatabilityVerdict, string> = {
  yes: 'bg-green-500',
  maybe: 'bg-amber-400',
  no: 'bg-red-500',
};

function weeklyHours(time: TimePerOccurrence, freq: Frequency): number {
  const t: Record<TimePerOccurrence, number> = {
    '<30min': 0.33,
    '30min-2hr': 1.25,
    'half-day': 4,
    'full-day': 8,
  };
  const f: Record<Frequency, number> = {
    daily: 5,
    weekly: 1,
    monthly: 0.25,
    quarterly: 0.083,
    'ad-hoc': 0.1,
  };
  return t[time] * f[freq];
}

function quadrant(a: Activity): string {
  const hrs = weeklyHours(a.timePerOccurrence, a.frequency);
  const drain = a.energy === 'drains';
  const high = hrs >= 2;
  if (drain && high) return 'PRIORITY';
  if (drain && !high) return 'TOLERABLE';
  if (!drain && high) return 'STRATEGIC';
  return 'HEALTHY';
}

const PROMPT_CATEGORIES = [
  {
    id: 'yesterday-week',
    label: 'Yesterday & this week',
    examples: ['Daily standup', 'Sprint planning', 'Code reviews', 'Writing docs', 'Syncs with product'],
  },
  {
    id: 'weekly-meetings',
    label: 'Weekly meetings',
    examples: ['1:1 with manager', 'Team retro', 'All-hands', 'Design reviews', 'Cross-team syncs'],
  },
  {
    id: 'on-call',
    label: 'On-call & incidents',
    examples: ['Alert triage', 'Incident response', 'Post-mortems', 'Runbook updates', 'Escalation calls'],
  },
  {
    id: 'chores',
    label: 'Manual chores',
    examples: ['Deploying to staging', 'Running data migrations', 'Updating spreadsheets', 'Manual test runs', 'Provisioning accounts'],
  },
];

// ── Join Form ──────────────────────────────────────────────────────────────

function JoinForm({
  sessionName,
  onJoin,
}: {
  sessionName: string;
  onJoin: (name: string, role: ParticipantRole) => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<ParticipantRole>('IC');

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">{sessionName}</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your name to join this session.</p>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onJoin(name.trim(), role)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
              Role (optional)
            </label>
            <div className="flex gap-1.5">
              {(['IC', 'EM', 'PM', 'UX', 'Other'] as ParticipantRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                    role === r
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => name.trim() && onJoin(name.trim(), role)}
            disabled={!name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                       text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join session
          </button>
        </div>
      </div>
    </main>
  );
}

// ── Activity Form ──────────────────────────────────────────────────────────

function ActivityForm({
  sessionId,
  participantId,
  prefillTitle,
  onClear,
}: {
  sessionId: string;
  participantId: string;
  prefillTitle: string;
  onClear: () => void;
}) {
  const [title, setTitle] = useState(prefillTitle);
  const [time, setTime] = useState<TimePerOccurrence>('<30min');
  const [freq, setFreq] = useState<Frequency>('weekly');
  const [energy, setEnergy] = useState<EnergyLevel>('neutral');

  useEffect(() => {
    if (prefillTitle) setTitle(prefillTitle);
  }, [prefillTitle]);

  const submit = () => {
    if (!title.trim()) return;
    socket.emit('activity:add', {
      sessionId,
      participantId,
      title: title.trim(),
      timePerOccurrence: time,
      frequency: freq,
      energy,
    });
    setTitle('');
    onClear();
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <input
        type="text"
        placeholder="What's the activity?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="w-full text-sm border-0 focus:outline-none placeholder-gray-400 mb-3"
        autoFocus
      />
      <div className="grid grid-cols-1 gap-2 mb-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Time per occurrence</p>
          <div className="flex flex-wrap gap-1">
            {(Object.entries(TIME_LABELS) as [TimePerOccurrence, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setTime(v)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  time === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Frequency</p>
          <div className="flex flex-wrap gap-1">
            {(Object.entries(FREQ_LABELS) as [Frequency, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFreq(v)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  freq === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Energy</p>
          <div className="flex gap-1">
            {(Object.entries(ENERGY_LABELS) as [EnergyLevel, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setEnergy(v)}
                className={`flex-1 text-xs px-2 py-1 rounded border transition-colors ${
                  energy === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 italic mb-3">
        Automatable? Not asked here — the team decides together.
      </p>
      <button
        onClick={submit}
        disabled={!title.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2
                   text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Submit activity
      </button>
    </div>
  );
}

// ── Activity Card (Engineer view) ──────────────────────────────────────────

function ActivityCard({
  activity,
  isOwn,
  sessionId,
  participantId,
  canEdit,
  onClick,
}: {
  activity: Activity;
  isOwn: boolean;
  sessionId: string;
  participantId: string;
  canEdit: boolean;
  onClick?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...activity });

  const saveEdit = () => {
    socket.emit('activity:edit', {
      sessionId,
      participantId,
      activityId: activity.id,
      updates: {
        title: draft.title,
        timePerOccurrence: draft.timePerOccurrence,
        frequency: draft.frequency,
        energy: draft.energy,
      },
    });
    setEditing(false);
  };

  const deleteActivity = () => {
    if (!confirm('Remove this activity?')) return;
    socket.emit('activity:delete', { sessionId, participantId, activityId: activity.id });
  };

  if (editing) {
    return (
      <div className="border border-blue-300 rounded-xl p-3 bg-blue-50">
        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          className="w-full text-sm border-0 bg-transparent focus:outline-none mb-2"
        />
        <div className="flex flex-wrap gap-1 mb-1">
          {(Object.keys(TIME_LABELS) as TimePerOccurrence[]).map((v) => (
            <button
              key={v}
              onClick={() => setDraft((d) => ({ ...d, timePerOccurrence: v }))}
              className={`text-xs px-1.5 py-0.5 rounded border ${
                draft.timePerOccurrence === v ? 'border-blue-500 bg-white' : 'border-gray-200 bg-white'
              }`}
            >
              {TIME_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mb-1">
          {(Object.keys(FREQ_LABELS) as Frequency[]).map((v) => (
            <button
              key={v}
              onClick={() => setDraft((d) => ({ ...d, frequency: v }))}
              className={`text-xs px-1.5 py-0.5 rounded border ${
                draft.frequency === v ? 'border-blue-500 bg-white' : 'border-gray-200 bg-white'
              }`}
            >
              {FREQ_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mb-2">
          {(Object.keys(ENERGY_LABELS) as EnergyLevel[]).map((v) => (
            <button
              key={v}
              onClick={() => setDraft((d) => ({ ...d, energy: v }))}
              className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${
                draft.energy === v ? 'border-blue-500 bg-white' : 'border-gray-200 bg-white'
              }`}
            >
              {ENERGY_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveEdit}
            className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 border border-gray-200 text-gray-600 text-xs py-1.5 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-3 bg-white ${ENERGY_COLORS[activity.energy]} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      }`}
    >
      <p className="text-sm font-medium mb-1">{activity.title}</p>
      <p className="text-xs opacity-70">
        {TIME_LABELS[activity.timePerOccurrence]} · {FREQ_LABELS[activity.frequency]}
      </p>
      <p className="text-xs opacity-70">{ENERGY_LABELS[activity.energy]}</p>
      {activity.coAuthors.length > 0 && (
        <p className="text-xs opacity-60 mt-1">
          +{activity.coAuthors.map((c) => c.name).join(', ')}
        </p>
      )}
      {isOwn && canEdit && (
        <div className="flex gap-1 mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="text-xs text-blue-600 hover:underline"
          >
            Edit
          </button>
          <span className="text-gray-300">·</span>
          <button
            onClick={(e) => { e.stopPropagation(); deleteActivity(); }}
            className="text-xs text-red-500 hover:underline"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Engineer Board ─────────────────────────────────────────────────────────

function EngineerBoard({
  session,
  myInfo,
}: {
  session: Session;
  myInfo: LocalInfo;
}) {
  const [prefillTitle, setPrefillTitle] = useState('');
  const [showForm, setShowForm] = useState(false);

  const myActivities = session.activities.filter((a) => a.authorId === myInfo.participantId);
  const teamActivities = session.activities.filter((a) => a.authorId !== myInfo.participantId);
  const enabledCategories = PROMPT_CATEGORIES.filter((c) =>
    session.enabledPromptCategoryIds.includes(c.id)
  );

  const handlePromptClick = (example: string) => {
    setPrefillTitle(example);
    setShowForm(true);
  };

  const handleTeamCardClick = (title: string) => {
    setPrefillTitle(title);
    setShowForm(true);
  };

  const isClosed = session.phase === 'closed';
  const inSubmission = session.phase === 'submission';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-sm">{session.name}</h1>
          <p className="text-xs text-gray-400">
            {session.phase === 'lobby' && 'Waiting for the facilitator to start…'}
            {session.phase === 'submission' && 'Submission open — add your activities below'}
            {session.phase === 'discussion' && 'Submission closed — discussion in progress'}
            {session.phase === 'closed' && 'Session closed'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{myInfo.name}</span>
          <span className="w-2 h-2 rounded-full bg-green-400" />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Prompt Rail */}
        <aside className="w-56 border-r border-gray-100 bg-white p-4 overflow-y-auto">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Activity prompts
          </p>
          {enabledCategories.map((cat) => (
            <div key={cat.id} className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-1.5">{cat.label}</p>
              <ul className="flex flex-col gap-1">
                {cat.examples.map((ex) => (
                  <li key={ex}>
                    <button
                      onClick={() => inSubmission && handlePromptClick(ex)}
                      disabled={!inSubmission}
                      className="text-left text-xs text-gray-600 hover:text-blue-600 hover:underline
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {ex}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* Center: Own Cards */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Your activities ({myActivities.length})
            </p>
            {inSubmission && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add
              </button>
            )}
          </div>

          {showForm && inSubmission && (
            <div className="mb-3">
              <ActivityForm
                sessionId={session.id}
                participantId={myInfo.participantId}
                prefillTitle={prefillTitle}
                onClear={() => { setPrefillTitle(''); setShowForm(false); }}
              />
            </div>
          )}

          {myActivities.length === 0 && !showForm && (
            <p className="text-sm text-gray-400">
              {inSubmission
                ? 'No activities yet. Use the prompts on the left or click + Add.'
                : 'No activities submitted.'}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {myActivities.map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                isOwn
                sessionId={session.id}
                participantId={myInfo.participantId}
                canEdit={inSubmission}
              />
            ))}
          </div>
        </main>

        {/* Right: Team Feed */}
        {session.showTeamFeedToEngineers && (
          <aside className="w-56 border-l border-gray-100 bg-white p-4 overflow-y-auto">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              Team feed ({teamActivities.length})
            </p>
            {teamActivities.length === 0 ? (
              <p className="text-xs text-gray-400">Waiting for teammates…</p>
            ) : (
              <div className="flex flex-col gap-2">
                {teamActivities.map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    isOwn={false}
                    sessionId={session.id}
                    participantId={myInfo.participantId}
                    canEdit={false}
                    onClick={inSubmission ? () => handleTeamCardClick(a.title) : undefined}
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

// ── Facilitator: Edit Modal ────────────────────────────────────────────────

function EditModal({
  activity,
  facilitatorId,
  facilitatorName,
  sessionId,
  onClose,
}: {
  activity: Activity;
  facilitatorId: string;
  facilitatorName: string;
  sessionId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(activity.title);
  const [time, setTime] = useState<TimePerOccurrence>(activity.timePerOccurrence);
  const [freq, setFreq] = useState<Frequency>(activity.frequency);
  const [energy, setEnergy] = useState<EnergyLevel>(activity.energy);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/sessions/${sessionId}/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facilitatorId,
        editorName: facilitatorName,
        updates: { title, timePerOccurrence: time, frequency: freq, energy },
      }),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
        <p className="text-xs text-amber-600 font-medium mb-3">
          Editing on behalf of {activity.authorName}
        </p>
        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <p className="text-xs text-gray-400 mb-1">Time per occurrence</p>
            <div className="flex flex-wrap gap-1">
              {(Object.entries(TIME_LABELS) as [TimePerOccurrence, string][]).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setTime(v)}
                  className={`text-xs px-2 py-1 rounded border ${
                    time === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Frequency</p>
            <div className="flex flex-wrap gap-1">
              {(Object.entries(FREQ_LABELS) as [Frequency, string][]).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFreq(v)}
                  className={`text-xs px-2 py-1 rounded border ${
                    freq === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Energy</p>
            <div className="flex gap-1">
              {(Object.entries(ENERGY_LABELS) as [EnergyLevel, string][]).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setEnergy(v)}
                  className={`flex-1 text-xs px-2 py-1 rounded border ${
                    energy === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          {activity.auditLog.length > 0 && (
            <div className="text-xs text-gray-400 border-t pt-2">
              <p className="font-medium text-gray-500 mb-1">Edit history</p>
              {activity.auditLog.map((e, i) => (
                <p key={i}>
                  {e.editorName} changed {e.field}: "{e.from}" → "{e.to}"
                </p>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Facilitator: Activity Card with curation actions ───────────────────────

function FacilitatorCard({
  activity,
  sessionId,
  facilitatorId,
  facilitatorName,
  onMergeStart,
  compact,
}: {
  activity: Activity;
  sessionId: string;
  facilitatorId: string;
  facilitatorName: string;
  onMergeStart: (a: Activity) => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  const removeActivity = async () => {
    if (!confirm('Remove this activity?')) return;
    await fetch(`/api/sessions/${sessionId}/activities/${activity.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilitatorId }),
    });
  };

  const toggleFlag = async () => {
    await fetch(`/api/sessions/${sessionId}/activities/${activity.id}/flag`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilitatorId }),
    });
  };

  return (
    <>
      {editing && (
        <EditModal
          activity={activity}
          facilitatorId={facilitatorId}
          facilitatorName={facilitatorName}
          sessionId={sessionId}
          onClose={() => setEditing(false)}
        />
      )}
      <div
        className={`border rounded-xl bg-white ${ENERGY_COLORS[activity.energy]} ${
          compact ? 'p-2' : 'p-3'
        } ${activity.flagged ? 'ring-2 ring-amber-400' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>{activity.title}</p>
          <button
            onClick={toggleFlag}
            title={activity.flagged ? 'Unflag' : 'Flag as priority'}
            className={`shrink-0 text-lg leading-none ${activity.flagged ? 'text-amber-500' : 'text-gray-200 hover:text-amber-400'}`}
          >
            ★
          </button>
        </div>
        <p className="text-xs opacity-70 mt-0.5">
          {TIME_LABELS[activity.timePerOccurrence]} · {FREQ_LABELS[activity.frequency]}
        </p>
        <p className="text-xs opacity-70">{activity.authorName}{activity.coAuthors.length > 0 ? ` +${activity.coAuthors.length}` : ''}</p>
        {activity.automatability && (
          <span
            className={`inline-block mt-1 text-xs text-white px-1.5 py-0.5 rounded ${
              VERDICT_COLORS[activity.automatability]
            }`}
          >
            {activity.automatability}
          </span>
        )}
        {!compact && (
          <div className="flex gap-2 mt-2">
            <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
            <span className="text-gray-300">·</span>
            <button onClick={() => onMergeStart(activity)} className="text-xs text-purple-600 hover:underline">Merge</button>
            <span className="text-gray-300">·</span>
            <button onClick={removeActivity} className="text-xs text-red-500 hover:underline">Remove</button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Facilitator: Priority Matrix ───────────────────────────────────────────

function MatrixView({
  activities,
  sessionId,
  facilitatorId,
  facilitatorName,
  onMergeStart,
}: {
  activities: Activity[];
  sessionId: string;
  facilitatorId: string;
  facilitatorName: string;
  onMergeStart: (a: Activity) => void;
}) {
  const [selected, setSelected] = useState<Activity | null>(null);
  const MAX_HOURS = 20;

  const energyToY: Record<EnergyLevel, number> = {
    drains: 15,
    neutral: 50,
    energizes: 85,
  };

  return (
    <div className="flex gap-6">
      {/* Matrix */}
      <div className="relative flex-1" style={{ aspectRatio: '1/1', maxHeight: 480 }}>
        {/* Background quadrants */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="flex items-start justify-start p-2">
            <span className="text-xs text-gray-400 font-medium">TOLERABLE</span>
          </div>
          <div className="flex items-start justify-end p-2 bg-red-50/40 rounded-tr-xl">
            <span className="text-xs text-red-400 font-medium">PRIORITY</span>
          </div>
          <div className="flex items-end justify-start p-2 bg-green-50/40 rounded-bl-xl">
            <span className="text-xs text-green-500 font-medium">HEALTHY</span>
          </div>
          <div className="flex items-end justify-end p-2">
            <span className="text-xs text-blue-400 font-medium">STRATEGIC</span>
          </div>
        </div>

        {/* Dividing lines */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200" />

        {/* Axis labels */}
        <div className="absolute -left-12 top-1/4 text-xs text-gray-400 -rotate-90 whitespace-nowrap">
          Draining
        </div>
        <div className="absolute -left-12 bottom-1/4 text-xs text-gray-400 -rotate-90 whitespace-nowrap">
          Energizing
        </div>
        <div className="absolute bottom-0 left-1/4 text-xs text-gray-400 translate-y-5">
          Low effort
        </div>
        <div className="absolute bottom-0 right-1/4 text-xs text-gray-400 translate-y-5">
          High effort
        </div>

        {/* Dots */}
        {activities.map((a) => {
          const hrs = weeklyHours(a.timePerOccurrence, a.frequency);
          const x = Math.min((hrs / MAX_HOURS) * 100, 95);
          const y = energyToY[a.energy];
          const color = a.automatability
            ? VERDICT_COLORS[a.automatability]
            : 'bg-gray-300';

          return (
            <button
              key={a.id}
              onClick={() => setSelected(selected?.id === a.id ? null : a)}
              title={a.title}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={`absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow ${color} ${
                selected?.id === a.id ? 'ring-2 ring-offset-1 ring-blue-500 scale-125' : ''
              } transition-transform`}
            />
          );
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-64 shrink-0">
          <FacilitatorCard
            activity={selected}
            sessionId={sessionId}
            facilitatorId={facilitatorId}
            facilitatorName={facilitatorName}
            onMergeStart={onMergeStart}
          />
          <div className="mt-2 text-xs text-gray-400">
            <p>Quadrant: <span className="font-medium text-gray-600">{quadrant(selected)}</span></p>
            <p>~{weeklyHours(selected.timePerOccurrence, selected.frequency).toFixed(1)} hrs/week</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Facilitator: Discussion Mode ───────────────────────────────────────────

function DiscussionView({
  session,
  facilitatorId,
  facilitatorName,
}: {
  session: Session;
  facilitatorId: string;
  facilitatorName: string;
}) {
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const order = session.discussionOrder;
  const idx = session.discussionIndex;
  const currentId = order[idx];
  const current = session.activities.find((a) => a.id === currentId);

  const navigate = useCallback(
    async (delta: number) => {
      const newIdx = Math.max(0, Math.min(idx + delta, order.length - 1));
      await fetch(`/api/sessions/${session.id}/discussion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilitatorId, index: newIdx }),
      });
    },
    [session.id, facilitatorId, idx, order.length]
  );

  const setVerdict = useCallback(
    async (automatability: AutomatabilityVerdict | null) => {
      if (!currentId) return;
      setSavingNote(true);
      await fetch(`/api/sessions/${session.id}/activities/${currentId}/verdict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilitatorId, automatability, facilitatorNote: note }),
      });
      setSavingNote(false);
      setNote('');
    },
    [session.id, facilitatorId, currentId, note]
  );

  const toggleFlag = useCallback(async () => {
    if (!currentId) return;
    await fetch(`/api/sessions/${session.id}/activities/${currentId}/flag`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilitatorId }),
    });
  }, [session.id, facilitatorId, currentId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === '1') setVerdict('yes');
      if (e.key === '2') setVerdict('maybe');
      if (e.key === '3') setVerdict('no');
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'f') toggleFlag();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setVerdict, navigate, toggleFlag]);

  useEffect(() => {
    if (current) setNote(current.facilitatorNote || '');
  }, [current?.id]);

  const flagged = session.activities.filter((a) => a.flagged);

  if (!current) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No activities in discussion queue.
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main discussion area */}
      <div className="flex-1">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${((idx + 1) / order.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {idx + 1} / {order.length}
          </span>
        </div>

        {/* Current activity */}
        <div className={`border-2 rounded-2xl p-5 mb-4 ${ENERGY_COLORS[current.energy]}`}>
          <p className="text-lg font-semibold mb-1">{current.title}</p>
          <p className="text-sm opacity-70 mb-0.5">
            {TIME_LABELS[current.timePerOccurrence]} · {FREQ_LABELS[current.frequency]} ·{' '}
            ~{weeklyHours(current.timePerOccurrence, current.frequency).toFixed(1)} hrs/week
          </p>
          <p className="text-sm opacity-70 mb-0.5">{ENERGY_LABELS[current.energy]}</p>
          <p className="text-sm opacity-60">
            {current.authorName}
            {current.coAuthors.length > 0 &&
              ` + ${current.coAuthors.map((c) => c.name).join(', ')}`}
          </p>
          {current.mergedFrom.length > 0 && (
            <p className="text-xs mt-1 opacity-50">
              Merged from {current.mergedFrom.length} submission(s)
            </p>
          )}
        </div>

        {/* Verdict buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setVerdict('yes')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
              current.automatability === 'yes'
                ? 'bg-green-500 text-white border-green-500'
                : 'border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            Yes — automate it <kbd className="text-xs opacity-60 ml-1">1</kbd>
          </button>
          <button
            onClick={() => setVerdict('maybe')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
              current.automatability === 'maybe'
                ? 'bg-amber-400 text-white border-amber-400'
                : 'border-amber-300 text-amber-700 hover:bg-amber-50'
            }`}
          >
            Maybe <kbd className="text-xs opacity-60 ml-1">2</kbd>
          </button>
          <button
            onClick={() => setVerdict('no')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
              current.automatability === 'no'
                ? 'bg-red-500 text-white border-red-500'
                : 'border-red-300 text-red-700 hover:bg-red-50'
            }`}
          >
            No <kbd className="text-xs opacity-60 ml-1">3</kbd>
          </button>
        </div>

        {/* Discussion note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Discussion note (optional)…"
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        />

        {/* Nav + actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            disabled={idx === 0}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600
                       hover:bg-gray-50 disabled:opacity-40"
          >
            ← Prev
          </button>
          <button
            onClick={() => navigate(1)}
            disabled={idx >= order.length - 1}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600
                       hover:bg-gray-50 disabled:opacity-40"
          >
            Next →
          </button>
          <button
            onClick={toggleFlag}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
              current.flagged
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {current.flagged ? '★ Flagged' : '☆ Flag'} <kbd className="text-xs opacity-60 ml-1">f</kbd>
          </button>
        </div>
      </div>

      {/* Flagged rail */}
      <div className="w-52 shrink-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
          Flagged ({flagged.length})
        </p>
        {flagged.length === 0 ? (
          <p className="text-xs text-gray-400">Nothing flagged yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {flagged.map((a) => (
              <div
                key={a.id}
                className={`border rounded-lg p-2 bg-white ${ENERGY_COLORS[a.energy]}`}
              >
                <p className="text-xs font-medium truncate">{a.title}</p>
                <p className="text-xs opacity-60">{a.authorName}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Facilitator: Export View ───────────────────────────────────────────────

function ExportView({ session }: { session: Session }) {
  const flagged = session.activities.filter((a) => a.flagged);
  const all = session.activities;

  const exportText = flagged
    .map(
      (a) =>
        `## ${a.title}\n` +
        `- Author: ${[a.authorName, ...a.coAuthors.map((c) => c.name)].join(', ')}\n` +
        `- Effort: ${TIME_LABELS[a.timePerOccurrence]}, ${FREQ_LABELS[a.frequency]}\n` +
        `- Energy: ${ENERGY_LABELS[a.energy]}\n` +
        `- Automatability: ${a.automatability ?? 'not discussed'}\n` +
        `- Quadrant: ${quadrant(a)}\n` +
        (a.facilitatorNote ? `- Note: ${a.facilitatorNote}\n` : '')
    )
    .join('\n');

  return (
    <div className="max-w-2xl">
      <div className="flex gap-4 mb-6">
        {[
          { label: 'Total activities', value: all.length },
          { label: 'Flagged', value: flagged.length },
          { label: 'Participants', value: session.participants.length },
          { label: 'Draining', value: all.filter((a) => a.energy === 'drains').length },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-white border border-gray-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700">Flagged activities</p>
        <button
          onClick={() => navigator.clipboard.writeText(exportText)}
          className="text-xs text-blue-600 hover:underline"
        >
          Copy to clipboard
        </button>
      </div>

      {flagged.length === 0 ? (
        <p className="text-sm text-gray-400">No activities flagged yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {flagged.map((a) => (
            <div
              key={a.id}
              className={`border rounded-xl p-3 bg-white ${ENERGY_COLORS[a.energy]}`}
            >
              <div className="flex items-start justify-between">
                <p className="font-medium text-sm">{a.title}</p>
                <span className="text-xs text-gray-400 ml-2">{quadrant(a)}</span>
              </div>
              <p className="text-xs opacity-70 mt-0.5">
                {[a.authorName, ...a.coAuthors.map((c) => c.name)].join(', ')} ·{' '}
                {TIME_LABELS[a.timePerOccurrence]} · {FREQ_LABELS[a.frequency]}
              </p>
              {a.automatability && (
                <span
                  className={`inline-block mt-1 text-xs text-white px-1.5 py-0.5 rounded ${
                    VERDICT_COLORS[a.automatability]
                  }`}
                >
                  {a.automatability}
                </span>
              )}
              {a.facilitatorNote && (
                <p className="text-xs text-gray-500 mt-1 italic">{a.facilitatorNote}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Merge Modal ────────────────────────────────────────────────────────────

function MergeModal({
  source,
  activities,
  sessionId,
  facilitatorId,
  onClose,
}: {
  source: Activity;
  activities: Activity[];
  sessionId: string;
  facilitatorId: string;
  onClose: () => void;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  // Simple word-overlap similarity
  const withScore = activities
    .filter((a) => a.id !== source.id)
    .map((a) => {
      const srcWords = new Set(source.title.toLowerCase().split(/\W+/));
      const tgtWords = a.title.toLowerCase().split(/\W+/);
      const overlap = tgtWords.filter((w) => srcWords.has(w)).length;
      return { activity: a, score: overlap };
    })
    .sort((a, b) => b.score - a.score);

  const merge = async () => {
    if (!targetId) return;
    setMerging(true);
    await fetch(`/api/sessions/${sessionId}/activities/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilitatorId, sourceId: source.id, targetId }),
    });
    setMerging(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm max-h-[80vh] flex flex-col">
        <h2 className="font-semibold mb-1">Merge activity</h2>
        <p className="text-xs text-gray-500 mb-3">
          Merging "{source.title}" by {source.authorName} into:
        </p>
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4">
          {withScore.map(({ activity: a, score }) => (
            <button
              key={a.id}
              onClick={() => setTargetId(a.id)}
              className={`text-left border rounded-xl p-3 transition-colors ${
                targetId === a.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-gray-400">{a.authorName}</p>
              {score > 0 && (
                <p className="text-xs text-blue-500">
                  {score} word{score > 1 ? 's' : ''} in common
                </p>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={merge}
            disabled={!targetId || merging}
            className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg disabled:opacity-40"
          >
            {merging ? 'Merging…' : 'Merge'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Facilitator Panel ──────────────────────────────────────────────────────

type FacilitatorTab = 'lobby' | 'stream' | 'matrix' | 'discussion' | 'export';

function FacilitatorPanel({
  session,
  myInfo,
}: {
  session: Session;
  myInfo: LocalInfo;
}) {
  const [tab, setTab] = useState<FacilitatorTab>(
    session.phase === 'lobby' ? 'lobby' :
    session.phase === 'submission' ? 'stream' :
    session.phase === 'discussion' ? 'discussion' :
    'export'
  );
  const [mergingActivity, setMergingActivity] = useState<Activity | null>(null);

  const facilitatorId = myInfo.participantId;

  const changePhase = async (phase: string) => {
    await fetch(`/api/sessions/${session.id}/phase`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilitatorId, phase }),
    });
  };

  // Available tabs by phase
  const tabs: { id: FacilitatorTab; label: string }[] = [
    ...(session.phase === 'lobby' ? [{ id: 'lobby' as FacilitatorTab, label: 'Lobby' }] : []),
    ...(session.phase !== 'lobby' ? [{ id: 'stream' as FacilitatorTab, label: 'Live stream' }] : []),
    ...(session.phase !== 'lobby' ? [{ id: 'matrix' as FacilitatorTab, label: 'Matrix' }] : []),
    ...(session.phase === 'discussion' || session.phase === 'closed'
      ? [{ id: 'discussion' as FacilitatorTab, label: 'Discussion' }]
      : []),
    ...(session.phase !== 'lobby' ? [{ id: 'export' as FacilitatorTab, label: 'Export' }] : []),
  ];

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/session/${session.id}`
    : `/session/${session.id}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {mergingActivity && (
        <MergeModal
          source={mergingActivity}
          activities={session.activities}
          sessionId={session.id}
          facilitatorId={facilitatorId}
          onClose={() => setMergingActivity(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-sm">{session.name}</h1>
          <p className="text-xs text-gray-400 capitalize">{session.phase} phase</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Phase controls */}
          {session.phase === 'lobby' && (
            <button
              onClick={() => { changePhase('submission'); setTab('stream'); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg"
            >
              Start session
            </button>
          )}
          {session.phase === 'submission' && (
            <button
              onClick={() => { changePhase('discussion'); setTab('discussion'); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg"
            >
              Close submissions &amp; start discussion
            </button>
          )}
          {session.phase === 'discussion' && (
            <button
              onClick={() => { changePhase('closed'); setTab('export'); }}
              className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg"
            >
              Close session
            </button>
          )}
          <span className="text-xs text-gray-400">{myInfo.name} (facilitator)</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.id === 'export' && session.activities.filter((a) => a.flagged).length > 0 && (
                <span className="ml-1 bg-amber-400 text-white text-xs px-1 rounded-full">
                  {session.activities.filter((a) => a.flagged).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Lobby */}
        {tab === 'lobby' && (
          <div className="max-w-lg">
            <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                Join link
              </p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all">
                  {joinUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(joinUrl)}
                  className="text-xs text-blue-600 hover:underline shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Participants ({session.participants.length})
            </p>
            {session.participants.length === 0 ? (
              <p className="text-sm text-gray-400">No one has joined yet. Share the link above.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {session.participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${p.isOnline ? 'bg-green-400' : 'bg-gray-200'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Stream */}
        {tab === 'stream' && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              All activities ({session.activities.length})
            </p>
            {session.activities.length === 0 ? (
              <p className="text-sm text-gray-400">No activities submitted yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {session.activities.map((a) => (
                  <FacilitatorCard
                    key={a.id}
                    activity={a}
                    sessionId={session.id}
                    facilitatorId={facilitatorId}
                    facilitatorName={myInfo.name}
                    onMergeStart={setMergingActivity}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Matrix */}
        {tab === 'matrix' && (
          <MatrixView
            activities={session.activities}
            sessionId={session.id}
            facilitatorId={facilitatorId}
            facilitatorName={myInfo.name}
            onMergeStart={setMergingActivity}
          />
        )}

        {/* Discussion */}
        {tab === 'discussion' && (
          session.phase === 'discussion' ? (
            <DiscussionView
              session={session}
              facilitatorId={facilitatorId}
              facilitatorName={myInfo.name}
            />
          ) : (
            <p className="text-sm text-gray-400">Session is {session.phase}.</p>
          )
        )}

        {/* Export */}
        {tab === 'export' && <ExportView session={session} />}
      </main>
    </div>
  );
}

// ── Main Session Page ──────────────────────────────────────────────────────

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localInfo, setLocalInfo] = useState<LocalInfo | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [sessionNameForJoin, setSessionNameForJoin] = useState('');

  // Merge socket activity update into state
  const updateActivity = useCallback((updated: Activity) => {
    setSession((s) =>
      s
        ? {
            ...s,
            activities: s.activities.map((a) => (a.id === updated.id ? updated : a)),
          }
        : s
    );
  }, []);

  const addActivity = useCallback((activity: Activity) => {
    setSession((s) =>
      s ? { ...s, activities: [...s.activities.filter((a) => a.id !== activity.id), activity] } : s
    );
  }, []);

  const removeActivity = useCallback((activityId: string) => {
    setSession((s) =>
      s ? { ...s, activities: s.activities.filter((a) => a.id !== activityId) } : s
    );
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    // Check localStorage for existing session context
    const facilitatorId = localStorage.getItem(`session_${sessionId}_facilitatorId`);
    const storedName = localStorage.getItem(`session_${sessionId}_name`);
    const storedRole = localStorage.getItem(`session_${sessionId}_role`);
    const storedParticipantId = localStorage.getItem(`session_${sessionId}_participantId`);

    // Load session from API first
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Session not found');
        return r.json();
      })
      .then((data: Session) => {
        setSession(data);
        setLoading(false);

        if (facilitatorId) {
          setLocalInfo({
            participantId: facilitatorId,
            name: storedName || data.facilitatorName,
            role: null,
            isFacilitator: true,
          });
        } else if (storedParticipantId && storedName) {
          setLocalInfo({
            participantId: storedParticipantId,
            name: storedName,
            role: (storedRole as ParticipantRole) || 'IC',
            isFacilitator: false,
          });
        } else {
          setSessionNameForJoin(data.name);
          setNeedsJoin(true);
          setLoading(false);
        }
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [sessionId]);

  // Connect socket once localInfo is set
  useEffect(() => {
    if (!localInfo || !sessionId) return;

    socket.connect();
    socket.emit('session:join', {
      sessionId,
      participantId: localInfo.participantId,
      name: localInfo.name,
      role: localInfo.role || 'IC',
      isFacilitator: localInfo.isFacilitator,
    });

    socket.on('session:state', (s: Session) => setSession(s));
    socket.on('participant:joined', (p: Participant) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              participants: [
                ...prev.participants.filter((x) => x.id !== p.id),
                p,
              ],
            }
          : prev
      );
    });
    socket.on('participant:left', ({ participantId }: { participantId: string }) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map((p) =>
                p.id === participantId ? { ...p, isOnline: false } : p
              ),
            }
          : prev
      );
    });
    socket.on('activity:added', addActivity);
    socket.on('activity:updated', updateActivity);
    socket.on('activity:merged', ({ sourceId, target }: { sourceId: string; target: Activity }) => {
      setSession((s) =>
        s
          ? {
              ...s,
              activities: s.activities
                .filter((a) => a.id !== sourceId)
                .map((a) => (a.id === target.id ? target : a)),
            }
          : s
      );
    });
    socket.on('activity:removed', ({ activityId }: { activityId: string }) => removeActivity(activityId));
    socket.on('session:phase', (data: Partial<Session>) => {
      setSession((s) => (s ? { ...s, ...data } : s));
    });
    socket.on('discussion:advanced', ({ discussionIndex }: { discussionIndex: number }) => {
      setSession((s) => (s ? { ...s, discussionIndex } : s));
    });
    socket.on('error', ({ message }: { message: string }) => setError(message));

    return () => {
      socket.off('session:state');
      socket.off('participant:joined');
      socket.off('participant:left');
      socket.off('activity:added');
      socket.off('activity:updated');
      socket.off('activity:merged');
      socket.off('activity:removed');
      socket.off('session:phase');
      socket.off('discussion:advanced');
      socket.off('error');
      socket.disconnect();
    };
  }, [localInfo, sessionId, addActivity, updateActivity, removeActivity]);

  const handleJoin = (name: string, role: ParticipantRole) => {
    const participantId = crypto.randomUUID();
    localStorage.setItem(`session_${sessionId}_participantId`, participantId);
    localStorage.setItem(`session_${sessionId}_name`, name);
    localStorage.setItem(`session_${sessionId}_role`, role);
    setLocalInfo({ participantId, name, role, isFacilitator: false });
    setNeedsJoin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading session…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button onClick={() => router.push('/')} className="text-sm text-blue-600 hover:underline">
            Back to home
          </button>
        </div>
      </div>
    );
  }

  if (needsJoin || !localInfo) {
    return (
      <JoinForm
        sessionName={sessionNameForJoin}
        onJoin={handleJoin}
      />
    );
  }

  if (!session) return null;

  if (localInfo.isFacilitator) {
    return <FacilitatorPanel session={session} myInfo={localInfo} />;
  }

  return <EngineerBoard session={session} myInfo={localInfo} />;
}
