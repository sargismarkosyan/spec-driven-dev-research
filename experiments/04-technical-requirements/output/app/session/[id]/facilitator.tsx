'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, Participant, Activity } from '@/lib/types';
import { effortHrsPerWk, effortDisplay, matrixX, matrixY } from '@/lib/types';

type Tab = 'lobby' | 'live' | 'matrix' | 'grouped' | 'discussion' | 'export';

type Props = {
  session: Session;
  participants: Participant[];
  activities: Activity[];
  token: string;
  sessionId: string;
  onSessionUpdate: (s: Session) => void;
  onActivitiesUpdate: (fn: (prev: Activity[]) => Activity[]) => void;
};

// ── Word-overlap similarity for merge candidates ─────────────────────────────
function similarity(a: string, b: string): number {
  const words = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter(Boolean));
  const wa = words(a), wb = words(b);
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : inter / union;
}

// ── Shared UI atoms ──────────────────────────────────────────────────────────
function Chip({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const cls: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-50 text-red-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return <span className={`text-xs rounded px-1.5 py-0.5 ${cls[color] ?? cls.gray}`}>{children}</span>;
}

function TeamAutoBadge({ v }: { v: Activity['teamAuto'] }) {
  const map: Record<Activity['teamAuto'], { label: string; color: string }> = {
    yes: { label: 'Automate', color: 'text-red-700 bg-red-50 border-red-200' },
    maybe: { label: 'Maybe', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    no: { label: 'Manual', color: 'text-slate-600 bg-slate-100 border-slate-200' },
    unclassified: { label: 'Unclassified', color: 'text-gray-400 bg-gray-50 border-gray-200 border-dashed' },
  };
  const { label, color } = map[v];
  return <span className={`text-xs rounded px-2 py-0.5 border font-medium ${color}`}>{label}</span>;
}

// ── Activity card used in facilitator views ──────────────────────────────────
function FacilitatorCard({
  activity,
  participants,
  onEdit,
  onMerge,
  onRemove,
  onFlag,
  onClassify,
}: {
  activity: Activity;
  participants: Participant[];
  onEdit?: () => void;
  onMerge?: () => void;
  onRemove?: () => void;
  onFlag?: () => void;
  onClassify?: (v: 'yes' | 'maybe' | 'no') => void;
}) {
  const contributors = activity.contributorIds
    .map((id) => participants.find((p) => p.id === id)?.name ?? '?')
    .filter((v, i, a) => a.indexOf(v) === i);
  const hrs = effortHrsPerWk(activity);

  return (
    <div className={`bg-white rounded-lg border p-3 group ${activity.flaggedByFacilitator ? 'border-amber-300' : 'border-gray-200'}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 leading-snug">{activity.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{contributors.join(', ')}</p>
          <div className="flex flex-wrap gap-1 mt-2 items-center">
            <Chip>{activity.tpo}</Chip>
            <Chip>{activity.freq}</Chip>
            <Chip color={activity.energy === 'draining' ? 'red' : activity.energy === 'energizing' ? 'green' : 'gray'}>
              {activity.energy}
            </Chip>
            <span className="ml-auto text-xs font-medium text-gray-500">{effortDisplay(hrs)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <TeamAutoBadge v={activity.teamAuto} />
            {activity.flaggedByFacilitator && (
              <span className="text-xs text-amber-600 font-medium">⚑ Flagged</span>
            )}
          </div>
        </div>
      </div>
      {/* Hover actions */}
      <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && <button onClick={onEdit} className="text-xs text-blue-600 hover:underline">Edit</button>}
        {onMerge && <button onClick={onMerge} className="text-xs text-purple-600 hover:underline">Merge</button>}
        {onFlag && (
          <button onClick={onFlag} className="text-xs text-amber-600 hover:underline">
            {activity.flaggedByFacilitator ? 'Unflag' : 'Flag'}
          </button>
        )}
        {onClassify && (
          <>
            <button onClick={() => onClassify('yes')} className="text-xs text-red-600 hover:underline">Yes</button>
            <button onClick={() => onClassify('maybe')} className="text-xs text-amber-600 hover:underline">Maybe</button>
            <button onClick={() => onClassify('no')} className="text-xs text-slate-600 hover:underline">No</button>
          </>
        )}
        {onRemove && <button onClick={onRemove} className="text-xs text-gray-400 hover:text-red-600 hover:underline ml-auto">Remove</button>}
      </div>
    </div>
  );
}

// ── Edit dialog ──────────────────────────────────────────────────────────────
function EditDialog({
  activity,
  participants,
  onClose,
  onSave,
  onRemove,
}: {
  activity: Activity;
  participants: Participant[];
  onClose: () => void;
  onSave: (fields: Partial<Pick<Activity, 'title' | 'tpo' | 'freq' | 'energy' | 'teamAuto' | 'flaggedByFacilitator'>>) => void;
  onRemove: () => void;
}) {
  const owner = participants.find((p) => p.id === activity.participantId);
  const [title, setTitle] = useState(activity.title);
  const [tpo, setTpo] = useState(activity.tpo);
  const [freq, setFreq] = useState(activity.freq);
  const [energy, setEnergy] = useState(activity.energy);
  const [teamAuto, setTeamAuto] = useState(activity.teamAuto);
  const [flagged, setFlagged] = useState(activity.flaggedByFacilitator);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="text-xs text-gray-500 mb-1">Editing on behalf of {owner?.name ?? '?'}</p>
          <h2 className="text-lg font-semibold">Edit Activity</h2>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <SegmentedControl
          label="Time per occurrence"
          options={['<30m', '30m-2h', 'half-day', 'day+'] as const}
          value={tpo}
          onChange={(v) => setTpo(v as Activity['tpo'])}
        />
        <SegmentedControl
          label="Frequency"
          options={['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'] as const}
          value={freq}
          onChange={(v) => setFreq(v as Activity['freq'])}
        />
        <SegmentedControl
          label="Energy"
          options={['energizing', 'neutral', 'draining'] as const}
          value={energy}
          onChange={(v) => setEnergy(v as Activity['energy'])}
        />
        <SegmentedControl
          label="Automatability"
          options={['yes', 'maybe', 'no', 'unclassified'] as const}
          value={teamAuto}
          onChange={(v) => setTeamAuto(v as Activity['teamAuto'])}
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm text-gray-700">Flag for priority</span>
        </label>
        {activity.editHistory.length > 0 && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Edit history ({activity.editHistory.length})</summary>
            <ul className="mt-1 space-y-1">
              {activity.editHistory.map((e, i) => (
                <li key={i}>{new Date(e.editedAt).toLocaleTimeString()} by {e.editedBy}: {Object.keys(e.changes).join(', ')}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="flex justify-between pt-2">
          <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove activity</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
            <button
              onClick={() => onSave({ title, tpo, freq, energy, teamAuto, flaggedByFacilitator: flagged })}
              className="bg-blue-600 text-white text-xs rounded-lg px-4 py-1.5 hover:bg-blue-700"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`px-2.5 py-1 rounded text-xs border transition-colors ${
              value === o ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Merge dialog ─────────────────────────────────────────────────────────────
function MergeDialog({
  source,
  candidates,
  participants,
  onClose,
  onMerge,
}: {
  source: Activity;
  candidates: Activity[];
  participants: Participant[];
  onClose: () => void;
  onMerge: (targetId: string) => void;
}) {
  const ranked = candidates
    .filter((c) => c.id !== source.id)
    .map((c) => ({ ...c, score: similarity(source.title, c.title) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Merge Activity</h2>
        <div className="bg-gray-50 rounded-lg p-3 text-sm font-medium text-gray-700">{source.title}</div>
        <p className="text-xs text-gray-500">Select a similar activity to merge with:</p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {ranked.length === 0 ? (
            <p className="text-xs text-gray-400">No candidates found.</p>
          ) : (
            ranked.map((c) => {
              const author = participants.find((p) => p.id === c.participantId);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selected === c.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-800">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {author?.name} · similarity {Math.round(c.score * 100)}%
                  </p>
                </button>
              );
            })
          )}
        </div>
        {selected && (
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
            Merged result: &ldquo;{source.title}&rdquo; — combined authors, summed effort.
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
          <button
            disabled={!selected}
            onClick={() => selected && onMerge(selected)}
            className="bg-purple-600 text-white text-xs rounded-lg px-4 py-1.5 hover:bg-purple-700 disabled:opacity-40"
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Priority Matrix (SVG scatter plot) ───────────────────────────────────────
const PLOT_W = 480;
const PLOT_H = 360;
const PAD = 40;

function PriorityMatrix({
  activities,
  participants,
  onSelect,
}: {
  activities: Activity[];
  participants: Participant[];
  onSelect: (a: Activity) => void;
}) {
  const dotColor = (a: Activity) => {
    if (a.teamAuto === 'yes') return '#c0392b';
    if (a.teamAuto === 'maybe') return '#e67e22';
    if (a.teamAuto === 'no') return '#7f8c8d';
    return 'white';
  };

  return (
    <div className="overflow-x-auto">
      <svg width={PLOT_W + PAD * 2} height={PLOT_H + PAD * 2} className="font-sans">
        {/* Axes */}
        <line x1={PAD} y1={PAD} x2={PAD} y2={PLOT_H + PAD} stroke="#e5e7eb" strokeWidth={1} />
        <line x1={PAD} y1={PLOT_H + PAD} x2={PLOT_W + PAD} y2={PLOT_H + PAD} stroke="#e5e7eb" strokeWidth={1} />

        {/* Quadrant dividers */}
        <line x1={PAD + PLOT_W / 2} y1={PAD} x2={PAD + PLOT_W / 2} y2={PLOT_H + PAD} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4 4" />
        <line x1={PAD} y1={PAD + PLOT_H / 2} x2={PLOT_W + PAD} y2={PAD + PLOT_H / 2} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4 4" />

        {/* Quadrant labels */}
        <text x={PLOT_W * 0.75 + PAD} y={PAD + 16} textAnchor="middle" fontSize={11} fill="#9ca3af" fontWeight="600">PRIORITY</text>
        <text x={PLOT_W * 0.25 + PAD} y={PAD + 16} textAnchor="middle" fontSize={11} fill="#9ca3af" fontWeight="600">TOLERABLE</text>
        <text x={PLOT_W * 0.75 + PAD} y={PLOT_H + PAD - 8} textAnchor="middle" fontSize={11} fill="#9ca3af" fontWeight="600">STRATEGIC</text>
        <text x={PLOT_W * 0.25 + PAD} y={PLOT_H + PAD - 8} textAnchor="middle" fontSize={11} fill="#9ca3af" fontWeight="600">HEALTHY</text>

        {/* Axis labels */}
        <text x={PAD + PLOT_W / 2} y={PLOT_H + PAD + 32} textAnchor="middle" fontSize={10} fill="#6b7280">← Low effort · High effort →</text>
        <text x={16} y={PAD + PLOT_H / 2} textAnchor="middle" fontSize={10} fill="#6b7280" transform={`rotate(-90, 16, ${PAD + PLOT_H / 2})`}>← Energizing · Draining →</text>

        {/* Dots */}
        {activities.map((a) => {
          const cx = PAD + matrixX(a) * PLOT_W;
          const cy = PAD + (1 - matrixY(a)) * PLOT_H;
          const fill = dotColor(a);
          const stroke = a.teamAuto === 'unclassified' ? '#9ca3af' : fill;
          const strokeDash = a.teamAuto === 'unclassified' ? '3 2' : undefined;
          return (
            <g key={a.id} onClick={() => onSelect(a)} style={{ cursor: 'pointer' }}>
              <circle
                cx={cx}
                cy={cy}
                r={8}
                fill={fill}
                fillOpacity={a.teamAuto === 'unclassified' ? 0 : 0.8}
                stroke={stroke}
                strokeWidth={2}
                strokeDasharray={strokeDash}
              />
              {a.flaggedByFacilitator && (
                <text x={cx + 8} y={cy - 6} fontSize={10} fill="#f59e0b">⚑</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main FacilitatorView ─────────────────────────────────────────────────────
export default function FacilitatorView({
  session,
  participants,
  activities,
  token,
  sessionId,
  onSessionUpdate,
  onActivitiesUpdate,
}: Props) {
  const [tab, setTab] = useState<Tab>('lobby');
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [mergeSource, setMergeSource] = useState<Activity | null>(null);
  const [matrixSelected, setMatrixSelected] = useState<Activity | null>(null);
  const [discussionIdx, setDiscussionIdx] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [exportMd, setExportMd] = useState('');
  const [copied, setCopied] = useState(false);
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/session/${sessionId}`;

  // Keyboard shortcuts for discussion mode
  useEffect(() => {
    if (tab !== 'discussion') return;
    const handler = (e: KeyboardEvent) => {
      const targets = activities.filter((a) => a.teamAuto === 'unclassified');
      const current = targets[discussionIdx];
      if (!current) return;
      if (e.key === '1') classifyActivity(current.id, 'yes');
      if (e.key === '2') classifyActivity(current.id, 'maybe');
      if (e.key === '3') classifyActivity(current.id, 'no');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tab, discussionIdx, activities]);

  const apiPatch = useCallback(
    async (path: string, body: object) => {
      const sep = path.includes('?') ? '&' : '?';
      await fetch(`/api/sessions/${sessionId}${path}${sep}token=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    [sessionId, token]
  );

  const updateStatus = (status: Session['status']) =>
    apiPatch('/status', { status }).then(() =>
      onSessionUpdate({ ...session, status })
    );

  const classifyActivity = (actId: string, teamAuto: 'yes' | 'maybe' | 'no') =>
    fetch(`/api/sessions/${sessionId}/activities/${actId}/classify?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamAuto }),
    });

  const flagActivity = (actId: string, flagged: boolean) =>
    fetch(`/api/sessions/${sessionId}/activities/${actId}/flag?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagged }),
    });

  const saveEdit = async (
    actId: string,
    fields: Partial<Pick<Activity, 'title' | 'tpo' | 'freq' | 'energy' | 'teamAuto' | 'flaggedByFacilitator'>>
  ) => {
    const { flaggedByFacilitator, teamAuto, ...rest } = fields;
    if (Object.keys(rest).length > 0) {
      await fetch(`/api/sessions/${sessionId}/activities/${actId}?token=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rest),
      });
    }
    if (teamAuto !== undefined) await classifyActivity(actId, teamAuto as 'yes' | 'maybe' | 'no');
    if (flaggedByFacilitator !== undefined) await flagActivity(actId, flaggedByFacilitator);
    setEditActivity(null);
  };

  const removeActivity = async (actId: string) => {
    await fetch(`/api/sessions/${sessionId}/activities/${actId}?token=${token}`, {
      method: 'DELETE',
    });
    setEditActivity(null);
    setMatrixSelected(null);
  };

  const mergeActivities = async (sourceId: string, targetId: string) => {
    await fetch(`/api/sessions/${sessionId}/activities/${sourceId}/merge?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId }),
    });
    setMergeSource(null);
  };

  const loadExport = async () => {
    const res = await fetch(`/api/sessions/${sessionId}/export?token=${token}`);
    const md = await res.text();
    setExportMd(md);
    setShowExport(true);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const totalEffort = activities.reduce((sum, a) => sum + effortHrsPerWk(a), 0);
  const classified = activities.filter((a) => a.teamAuto !== 'unclassified').length;
  const flaggedActivities = activities.filter((a) => a.flaggedByFacilitator);
  const unclassified = activities.filter((a) => a.teamAuto === 'unclassified');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'lobby', label: 'Lobby' },
    { id: 'live', label: 'Live Stream' },
    { id: 'matrix', label: 'Priority Matrix' },
    { id: 'grouped', label: 'Grouped' },
    { id: 'discussion', label: 'Discussion' },
    { id: 'export', label: 'Export' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">{session.name}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span>{participants.length} participants</span>
              <span>{activities.length} activities</span>
              <span>{Math.round(totalEffort * 10) / 10} h/wk total</span>
              <span className={`font-medium ${session.status === 'open' ? 'text-green-600' : session.status === 'reviewing' ? 'text-blue-600' : 'text-gray-500'}`}>
                {session.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session.status === 'open' && (
              <button
                onClick={() => updateStatus('reviewing')}
                className="bg-blue-600 text-white text-xs rounded-lg px-3 py-1.5 hover:bg-blue-700"
              >
                Start Review
              </button>
            )}
            {session.status === 'reviewing' && (
              <button
                onClick={() => updateStatus('closed')}
                className="bg-gray-600 text-white text-xs rounded-lg px-3 py-1.5 hover:bg-gray-700"
              >
                Close Session
              </button>
            )}
          </div>
        </div>
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                tab === t.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.id === 'matrix' && classified > 0 && (
                <span className="ml-1 text-xs text-gray-400">({classified}/{activities.length})</span>
              )}
              {t.id === 'export' && flaggedActivities.length > 0 && (
                <span className="ml-1 text-xs text-amber-600">({flaggedActivities.length})</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-auto p-6">

        {/* ── LOBBY ──────────────────────────────────────────────────── */}
        {tab === 'lobby' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Share with participants</h2>
              <div className="flex gap-2 mb-3">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600"
                />
                <button
                  onClick={() => copyText(shareUrl)}
                  className="bg-gray-900 text-white text-xs rounded-lg px-4 py-2 hover:bg-gray-700"
                >
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">Slack message template:</p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 font-mono">
                {`Hey team 👋 Join our work audit session and log activities that eat up your time. Link: ${shareUrl}`}
              </div>
              <button
                onClick={() => copyText(`Hey team 👋 Join our work audit session and log activities that eat up your time. Link: ${shareUrl}`)}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Copy Slack message
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">
                Participants ({participants.length})
              </h2>
              {participants.length === 0 ? (
                <p className="text-sm text-gray-400">Waiting for participants to join…</p>
              ) : (
                <div className="space-y-2">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center">
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.role} · joined {new Date(p.joinedAt).toLocaleTimeString()}</p>
                      </div>
                      <span className="ml-auto text-xs text-gray-400">
                        {activities.filter((a) => a.participantId === p.id).length} activities
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {session.status === 'open' && participants.length > 0 && (
              <button
                onClick={() => { updateStatus('reviewing'); setTab('live'); }}
                className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700"
              >
                Start Review Session →
              </button>
            )}
          </div>
        )}

        {/* ── LIVE STREAM ────────────────────────────────────────────── */}
        {tab === 'live' && (
          <div className="flex gap-6 max-w-6xl mx-auto">
            {/* Per-person counts */}
            <div className="w-44 shrink-0">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Submissions</h3>
              <div className="space-y-1">
                {participants.map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700 truncate">{p.name}</span>
                    <span className="text-gray-400 text-xs ml-1">
                      {activities.filter((a) => a.participantId === p.id).length}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div className="flex-1 space-y-2">
              {activities
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((a) => (
                  <FacilitatorCard
                    key={a.id}
                    activity={a}
                    participants={participants}
                    onEdit={() => setEditActivity(a)}
                    onMerge={() => setMergeSource(a)}
                    onRemove={() => removeActivity(a.id)}
                    onFlag={() => flagActivity(a.id, !a.flaggedByFacilitator)}
                    onClassify={(v) => classifyActivity(a.id, v)}
                  />
                ))}
              {activities.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-12">Waiting for activity submissions…</p>
              )}
            </div>

            {/* Right panel: themes + distribution */}
            <div className="w-56 shrink-0 space-y-4">
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Effort distribution</h3>
                {(['<30m', '30m-2h', 'half-day', 'day+'] as const).map((tpo) => {
                  const count = activities.filter((a) => a.tpo === tpo).length;
                  const pct = activities.length ? (count / activities.length) * 100 : 0;
                  return (
                    <div key={tpo} className="mb-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                        <span>{tpo}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Energy breakdown</h3>
                {(['energizing', 'neutral', 'draining'] as const).map((e) => {
                  const count = activities.filter((a) => a.energy === e).length;
                  const pct = activities.length ? (count / activities.length) * 100 : 0;
                  const color = e === 'draining' ? 'bg-red-400' : e === 'energizing' ? 'bg-green-400' : 'bg-gray-300';
                  return (
                    <div key={e} className="mb-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                        <span>{e}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PRIORITY MATRIX ────────────────────────────────────────── */}
        {tab === 'matrix' && (
          <div className="flex gap-6 max-w-6xl mx-auto">
            <div className="flex-1">
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-800">Priority Matrix</h3>
                  <span className="text-xs text-gray-400">{classified}/{activities.length} classified</span>
                </div>
                <div className="flex gap-4 text-xs mb-3">
                  <span><span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-1 align-middle" />Automate</span>
                  <span><span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-1 align-middle" />Maybe</span>
                  <span><span className="inline-block w-3 h-3 rounded-full bg-slate-500 mr-1 align-middle" />Manual</span>
                  <span><span className="inline-block w-3 h-3 rounded-full border-2 border-dashed border-gray-400 mr-1 align-middle" />Unclassified</span>
                </div>
                <PriorityMatrix
                  activities={activities}
                  participants={participants}
                  onSelect={(a) => setMatrixSelected(a)}
                />
              </div>
            </div>
            {matrixSelected && (
              <div className="w-80 shrink-0">
                <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-0">
                  <div className="flex justify-between mb-3">
                    <h3 className="font-medium text-gray-800 text-sm">Activity detail</h3>
                    <button onClick={() => setMatrixSelected(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  </div>
                  <FacilitatorCard
                    activity={matrixSelected}
                    participants={participants}
                    onEdit={() => { setEditActivity(matrixSelected); setMatrixSelected(null); }}
                    onFlag={() => flagActivity(matrixSelected.id, !matrixSelected.flaggedByFacilitator)}
                    onClassify={(v) => classifyActivity(matrixSelected.id, v)}
                    onRemove={() => removeActivity(matrixSelected.id)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GROUPED VIEW ───────────────────────────────────────────── */}
        {tab === 'grouped' && (
          <div className="max-w-6xl mx-auto">
            {unclassified.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Unclassified ({unclassified.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {unclassified.map((a) => (
                    <FacilitatorCard
                      key={a.id}
                      activity={a}
                      participants={participants}
                      onEdit={() => setEditActivity(a)}
                      onClassify={(v) => classifyActivity(a.id, v)}
                      onFlag={() => flagActivity(a.id, !a.flaggedByFacilitator)}
                      onRemove={() => removeActivity(a.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-6">
              {(['yes', 'maybe', 'no'] as const).map((verdict) => {
                const col = activities.filter((a) => a.teamAuto === verdict).sort((a, b) => effortHrsPerWk(b) - effortHrsPerWk(a));
                const label = { yes: 'Automatable', maybe: 'Maybe', no: 'Manual Forever' }[verdict];
                const color = { yes: 'text-red-600', maybe: 'text-amber-600', no: 'text-slate-600' }[verdict];
                return (
                  <div key={verdict}>
                    <h3 className={`text-sm font-semibold ${color} mb-3`}>
                      {label} ({col.length})
                    </h3>
                    <div className="space-y-2">
                      {col.map((a) => (
                        <FacilitatorCard
                          key={a.id}
                          activity={a}
                          participants={participants}
                          onEdit={() => setEditActivity(a)}
                          onFlag={() => flagActivity(a.id, !a.flaggedByFacilitator)}
                          onRemove={() => removeActivity(a.id)}
                        />
                      ))}
                      {col.length === 0 && (
                        <p className="text-xs text-gray-400">None yet</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DISCUSSION MODE ────────────────────────────────────────── */}
        {tab === 'discussion' && (
          <div className="max-w-6xl mx-auto flex gap-6">
            <div className="flex-1">
              {unclassified.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <p className="text-gray-500 font-medium">All activities classified!</p>
                  <p className="text-sm text-gray-400 mt-1">{classified} activities reviewed.</p>
                  <button
                    onClick={() => setTab('grouped')}
                    className="mt-4 bg-blue-600 text-white text-sm rounded-lg px-4 py-2 hover:bg-blue-700"
                  >
                    View grouped results →
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-3">
                    {discussionIdx + 1} / {unclassified.length} remaining · keyboard: 1=Yes 2=Maybe 3=No
                  </p>
                  {unclassified[discussionIdx] && (
                    <DiscussionCard
                      activity={unclassified[discussionIdx]}
                      participants={participants}
                      onClassify={(v) => {
                        classifyActivity(unclassified[discussionIdx].id, v);
                        setDiscussionIdx((i) => Math.min(i, unclassified.length - 2));
                      }}
                      onFlag={() => flagActivity(unclassified[discussionIdx].id, !unclassified[discussionIdx].flaggedByFacilitator)}
                      onSkip={() => setDiscussionIdx((i) => (i + 1) % unclassified.length)}
                      onPrev={() => setDiscussionIdx((i) => Math.max(0, i - 1))}
                    />
                  )}
                </>
              )}
            </div>
            {/* Flagged rail */}
            <div className="w-64 shrink-0">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                Flagged priorities ({flaggedActivities.length})
              </h3>
              <div className="space-y-2">
                {flaggedActivities.map((a) => (
                  <div key={a.id} className="bg-white rounded-lg border border-amber-200 p-2">
                    <p className="text-xs font-medium text-gray-800 leading-snug">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{effortDisplay(effortHrsPerWk(a))}</p>
                  </div>
                ))}
                {flaggedActivities.length === 0 && (
                  <p className="text-xs text-gray-400">Flag activities to track priorities.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── EXPORT ─────────────────────────────────────────────────── */}
        {tab === 'export' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 mb-1">Export Session</h2>
              <p className="text-sm text-gray-500 mb-4">
                {flaggedActivities.length} flagged activities ready to export.
              </p>
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 mb-4">
                Automatability was classified by the team during discussion — not self-reported.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={loadExport}
                  className="bg-gray-900 text-white text-sm rounded-lg px-4 py-2 hover:bg-gray-700"
                >
                  Generate Markdown
                </button>
              </div>
            </div>

            {exportMd && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-800 text-sm">Markdown Preview</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyText(exportMd)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <a
                      href={`data:text/markdown;charset=utf-8,${encodeURIComponent(exportMd)}`}
                      download="toil-audit.md"
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Download
                    </a>
                  </div>
                </div>
                <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-96 font-mono">
                  {exportMd}
                </pre>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-medium text-gray-800 mb-2 text-sm">MCP connector</h3>
              <p className="text-xs text-gray-500">
                Connect a Claude agent to this session&apos;s MCP server at{' '}
                <code className="bg-gray-100 px-1 rounded">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/mcp
                </code>{' '}
                and use the <code className="bg-gray-100 px-1 rounded">export_session</code> tool with
                sessionId <code className="bg-gray-100 px-1 rounded">{sessionId}</code>.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Dialogs */}
      {editActivity && (
        <EditDialog
          activity={editActivity}
          participants={participants}
          onClose={() => setEditActivity(null)}
          onSave={(fields) => saveEdit(editActivity.id, fields)}
          onRemove={() => removeActivity(editActivity.id)}
        />
      )}

      {mergeSource && (
        <MergeDialog
          source={mergeSource}
          candidates={activities}
          participants={participants}
          onClose={() => setMergeSource(null)}
          onMerge={(targetId) => mergeActivities(mergeSource.id, targetId)}
        />
      )}
    </div>
  );
}

// ── Discussion card (one-at-a-time) ──────────────────────────────────────────
function DiscussionCard({
  activity,
  participants,
  onClassify,
  onFlag,
  onSkip,
  onPrev,
}: {
  activity: Activity;
  participants: Participant[];
  onClassify: (v: 'yes' | 'maybe' | 'no') => void;
  onFlag: () => void;
  onSkip: () => void;
  onPrev: () => void;
}) {
  const author = participants.find((p) => p.id === activity.participantId);
  const hrs = effortHrsPerWk(activity);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 leading-snug">{activity.title}</h2>
        <p className="text-sm text-gray-400 mt-1">{author?.name} · {effortDisplay(hrs)}</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <Chip>{activity.tpo}</Chip>
        <Chip>{activity.freq}</Chip>
        <Chip color={activity.energy === 'draining' ? 'red' : activity.energy === 'energizing' ? 'green' : 'gray'}>
          {activity.energy}
        </Chip>
      </div>
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => onClassify('yes')}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
        >
          1 — Yes, automate
        </button>
        <button
          onClick={() => onClassify('maybe')}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
        >
          2 — Maybe
        </button>
        <button
          onClick={() => onClassify('no')}
          className="flex-1 bg-slate-500 hover:bg-slate-600 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
        >
          3 — No
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button onClick={onPrev} className="text-xs text-gray-400 hover:text-gray-600">← Prev</button>
          <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600">Skip →</button>
        </div>
        <button
          onClick={onFlag}
          className={`text-xs font-medium ${activity.flaggedByFacilitator ? 'text-amber-600' : 'text-gray-400 hover:text-amber-500'}`}
        >
          {activity.flaggedByFacilitator ? '⚑ Flagged' : '⚐ Flag priority'}
        </button>
      </div>
    </div>
  );
}
