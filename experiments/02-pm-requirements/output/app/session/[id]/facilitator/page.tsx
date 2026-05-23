'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { socket } from '@/lib/socket';

// ── Types ──────────────────────────────────────────────────────────────────

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
  discussionNote: string;
  editHistory: EditEntry[];
  createdAt: string;
  mergedInto?: string;
};

type EditEntry = {
  editedBy: string;
  editedByRole: string;
  editedAt: string;
  field: string;
  from: string;
  to: string;
};

type Participant = {
  id: string;
  name: string;
  role: string;
  joinedAt: string;
  isFacilitator: boolean;
};

type Session = {
  id: string;
  name: string;
  status: string;
  windowMinutes: number | null;
  windowStartedAt: string | null;
  activities: Activity[];
  participants: Participant[];
  discussionQueue: string[];
  discussionIndex: number;
};

// ── Label maps ─────────────────────────────────────────────────────────────

const TPO_LABELS: Record<string, string> = {
  lt30: '< 30 min', '30to2h': '30m–2h', halfday: 'Half day', fullday: 'Full day',
};
const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', adhoc: 'Ad hoc',
};
const ENERGY_LABELS: Record<string, string> = {
  energizes: 'Energizes', neutral: 'Neutral', drains: 'Drains',
};
const ENERGY_COLORS: Record<string, string> = {
  energizes: 'text-green-700 bg-green-50 border-green-200',
  neutral: 'text-gray-600 bg-gray-50 border-gray-200',
  drains: 'text-red-700 bg-red-50 border-red-200',
};
const VERDICT_COLORS: Record<string, string> = {
  yes: 'bg-emerald-500',
  maybe: 'bg-amber-400',
  no: 'bg-red-400',
};
const VERDICT_LABELS: Record<string, string> = { yes: 'Automatable', maybe: 'Maybe', no: 'Manual Forever' };

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function effortX(hrs: number) {
  return Math.min(95, (hrs / 8) * 90 + 5);
}
function energyY(energy: string) {
  return energy === 'drains' ? 15 : energy === 'neutral' ? 50 : 85;
}

// ── Edit Dialog ────────────────────────────────────────────────────────────

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

function EditDialog({ activity, sessionId, onClose }: {
  activity: Activity;
  sessionId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(activity.title);
  const [tpo, setTpo] = useState(activity.tpo);
  const [freq, setFreq] = useState(activity.frequency);
  const [energy, setEnergy] = useState(activity.energy);
  const [verdict, setVerdict] = useState(activity.autoVerdict ?? '');
  const [note, setNote] = useState(activity.discussionNote);
  const [histExpanded, setHistExpanded] = useState(false);

  const save = () => {
    socket.emit('activity:edit', {
      sessionId,
      activityId: activity.id,
      changes: {
        title,
        tpo,
        frequency: freq,
        energy,
        autoVerdict: verdict || null,
        discussionNote: note,
      },
    });
    onClose();
  };

  const remove = () => {
    socket.emit('activity:delete', { sessionId, activityId: activity.id });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Editing on behalf of {activity.authorName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {activity.flagged && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <span className="text-xs text-amber-700 font-medium">🚩 This activity is flagged</span>
            <button
              onClick={() => socket.emit('activity:flag', { sessionId, activityId: activity.id, flagged: false })}
              className="text-xs text-amber-600 hover:underline"
            >
              Unflag
            </button>
          </div>
        )}

        {/* Original preview */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs text-gray-500">
          <span className="font-medium">Original: </span>{activity.title} · {TPO_LABELS[activity.tpo]} · {FREQ_LABELS[activity.frequency]} · {ENERGY_LABELS[activity.energy]}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Title <span className="font-normal text-gray-400">(changes visible to author)</span></label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Time per occurrence</label>
          <div className="flex flex-col gap-1">
            {TPO_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setTpo(o.value)}
                className={`text-left px-3 py-1.5 rounded-lg text-sm border transition-colors ${tpo === o.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:border-blue-300'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
          <div className="flex flex-col gap-1">
            {FREQ_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setFreq(o.value)}
                className={`text-left px-3 py-1.5 rounded-lg text-sm border transition-colors ${freq === o.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:border-blue-300'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Energy</label>
          <div className="flex flex-col gap-1">
            {ENERGY_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setEnergy(o.value)}
                className={`text-left px-3 py-1.5 rounded-lg text-sm border transition-colors ${energy === o.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:border-blue-300'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Automatability</label>
          <div className="flex gap-2">
            {[{ v: 'yes', l: 'Automatable' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Manual Forever' }].map((o) => (
              <button key={o.v} onClick={() => setVerdict(verdict === o.v ? '' : o.v)}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${verdict === o.v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:border-blue-300'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Discussion note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a note for the export…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {activity.editHistory.length > 0 && (
          <div>
            <button
              onClick={() => setHistExpanded(!histExpanded)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {histExpanded ? '▲' : '▶'} Edit history ({activity.editHistory.length})
            </button>
            {histExpanded && (
              <div className="mt-2 flex flex-col gap-1">
                {activity.editHistory.map((h, i) => (
                  <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                    <span className="font-medium">{h.editedBy}</span> changed {h.field} from "{h.from}" to "{h.to}"
                    {' · '}{new Date(h.editedAt).toLocaleString()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button onClick={remove} className="text-xs text-red-500 hover:text-red-700">Remove activity</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={save} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Merge Dialog ───────────────────────────────────────────────────────────

function MergeDialog({ source, allActivities, sessionId, onClose }: {
  source: Activity;
  allActivities: Activity[];
  sessionId: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [preserveAuthors, setPreserveAuthors] = useState(true);
  const [sumEffort, setSumEffort] = useState(true);
  const [useSourceMeta, setUseSourceMeta] = useState(true);

  const candidates = allActivities
    .filter((a) => a.id !== source.id && !a.mergedInto)
    .filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()))
    .map((a) => {
      // simple similarity
      const wA = new Set(source.title.toLowerCase().split(/\W+/).filter(Boolean));
      const wB = new Set(a.title.toLowerCase().split(/\W+/).filter(Boolean));
      const inter = [...wA].filter((w) => wB.has(w)).length;
      const union = new Set([...wA, ...wB]).size;
      const semantic = union === 0 ? 0 : Math.round((inter / union) * 100);
      const cadence = source.frequency === a.frequency ? 100 : 0;
      const duration = source.tpo === a.tpo ? 100 : 0;
      const total = Math.round(semantic * 0.6 + cadence * 0.2 + duration * 0.2);
      return { activity: a, score: { total, semantic, cadence, duration } };
    })
    .sort((a, b) => b.score.total - a.score.total);

  const target = candidates.find((c) => c.activity.id === selected);
  const combinedEffort = target
    ? Math.round((source.effortHrsPerWeek + target.activity.effortHrsPerWeek) * 100) / 100
    : source.effortHrsPerWeek;

  const doMerge = async () => {
    if (!selected) return;
    await fetch(`/api/sessions/${sessionId}/activities/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: source.id, targetId: selected, preserveAuthors, sumEffort, useSourceMeta }),
    });
    onClose();
  };

  const doRelate = async () => {
    if (!selected) return;
    await fetch(`/api/sessions/${sessionId}/activities/relate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: source.id, targetId: selected }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Merge activities</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <span className="font-medium">Source:</span> {source.title} <span className="text-blue-500">({source.authorName})</span>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {candidates.map(({ activity: a, score }) => (
            <button
              key={a.id}
              onClick={() => setSelected(selected === a.id ? null : a.id)}
              className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                selected === a.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-800">{a.title}</span>
                <span className="text-xs font-mono text-gray-500">{score.total}%</span>
              </div>
              <div className="text-xs text-gray-400">
                {a.authorName} · semantic {score.semantic}% · cadence {score.cadence}% · duration {score.duration}%
              </div>
            </button>
          ))}
        </div>

        {target && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Merged preview</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex -space-x-1">
                {[source.authorName, target.activity.authorName].filter((v,i,a)=>a.indexOf(v)===i).map((n) => (
                  <div key={n} className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold border-2 border-white">
                    {initials(n)}
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-700">{source.title}</span>
            </div>
            <p className="text-xs text-gray-500">
              Effort: {source.effortHrsPerWeek}h + {target.activity.effortHrsPerWeek}h = {combinedEffort}h/wk
            </p>
            <p className="text-xs text-gray-400">
              Reported by {source.authorName} + {target.activity.authorName}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {[
            { label: 'Preserve both authors', val: preserveAuthors, set: setPreserveAuthors },
            { label: 'Sum the effort', val: sumEffort, set: setSumEffort },
            { label: "Use source card's energy & cadence", val: useSourceMeta, set: setUseSourceMeta },
          ].map((t) => (
            <div key={t.label} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{t.label}</span>
              <button
                onClick={() => t.set(!t.val)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${t.val ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${t.val ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button onClick={doRelate} disabled={!selected} className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40">
            Treat as related
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={doMerge} disabled={!selected}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40">
              Merge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export Modal ───────────────────────────────────────────────────────────

function ExportModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const [tab, setTab] = useState<'markdown' | 'csv' | 'mcp'>('markdown');
  const [filename, setFilename] = useState(`toil-${session.name.replace(/\s+/g, '-').toLowerCase()}`);
  const [copied, setCopied] = useState(false);
  const [include, setInclude] = useState({
    title: true, contributors: true, effort: true, verdict: true, notes: true, history: false,
  });

  const flagged = session.activities.filter((a) => a.flagged);

  const markdown = [
    `# Toil Tracker Export — ${session.name}`,
    '',
    '> Automatability was classified by the team during discussion — not self-reported by engineers.',
    '',
    ...flagged.map((a) => [
      include.title ? `## ${a.title}` : '',
      include.contributors ? `**Contributor:** ${a.authorName}` : '',
      include.effort ? `**Effort:** ~${a.effortHrsPerWeek}h/wk` : '',
      include.verdict ? `**Verdict:** ${a.autoVerdict ? VERDICT_LABELS[a.autoVerdict] : 'Unclassified'}` : '',
      include.notes && a.discussionNote ? `**Notes:** ${a.discussionNote}` : '',
      include.history && a.editHistory.length > 0
        ? `**Edit history:** ${a.editHistory.map((e) => `${e.editedBy} changed ${e.field} (${e.from}→${e.to})`).join('; ')}`
        : '',
    ].filter(Boolean).join('\n')).join('\n\n'),
  ].join('\n');

  const csv = [
    'Title,Contributor,Effort (h/wk),Verdict,Note',
    ...flagged.map((a) =>
      [a.title, a.authorName, a.effortHrsPerWeek, a.autoVerdict ?? 'unclassified', a.discussionNote]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');

  const download = () => {
    const content = tab === 'csv' ? csv : markdown;
    const ext = tab === 'csv' ? 'csv' : 'md';
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.${ext}`;
    a.click();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(tab === 'csv' ? csv : markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Export — {flagged.length} flagged activities</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex border-b border-gray-100 gap-4">
          {(['markdown', 'csv', 'mcp'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
              {t === 'mcp' ? 'Send via MCP' : t}
            </button>
          ))}
        </div>

        {tab === 'markdown' && (
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 w-44 shrink-0">
              <p className="text-xs font-medium text-gray-500">Include</p>
              {Object.entries(include).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-sm text-gray-700 capitalize cursor-pointer">
                  <input type="checkbox" checked={v} onChange={(e) => setInclude({ ...include, [k]: e.target.checked })} />
                  {k}
                </label>
              ))}
            </div>
            <pre className="flex-1 bg-gray-50 rounded-lg p-3 text-xs text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap">{markdown}</pre>
          </div>
        )}

        {tab === 'csv' && (
          <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap">{csv}</pre>
        )}

        {tab === 'mcp' && (
          <div className="text-sm text-gray-600 space-y-2">
            <p>Connect your AI assistant to this session's MCP server:</p>
            <code className="block bg-gray-50 rounded-lg p-3 text-xs font-mono">{window.location.origin}/mcp</code>
            <p className="text-gray-500 text-xs">Then ask your assistant to call <code>draft_backlog</code> or <code>summarize_session</code> with session id <code>{session.id}</code>.</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            placeholder="filename"
          />
          <button onClick={copy} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-blue-300">
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {tab !== 'mcp' && (
            <button onClick={download} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Activity Card (facilitator) ────────────────────────────────────────────

function FacilitatorCard({ activity, sessionId, onEdit, onMerge }: {
  activity: Activity;
  sessionId: string;
  onEdit: (a: Activity) => void;
  onMerge: (a: Activity) => void;
}) {
  const classify = (v: string) => {
    socket.emit('activity:classify', { sessionId, activityId: activity.id, verdict: v });
  };
  const flag = () => {
    socket.emit('activity:flag', { sessionId, activityId: activity.id, flagged: !activity.flagged });
  };
  const remove = () => {
    socket.emit('activity:delete', { sessionId, activityId: activity.id });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 group relative">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
          {initials(activity.authorName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{activity.title}</p>
          <p className="text-xs text-gray-400">{activity.authorName}</p>
        </div>
        {activity.flagged && <span className="text-amber-500 text-xs">🚩</span>}
        {activity.autoVerdict && (
          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${VERDICT_COLORS[activity.autoVerdict]}`}>
            {VERDICT_LABELS[activity.autoVerdict]}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{TPO_LABELS[activity.tpo]}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{FREQ_LABELS[activity.frequency]}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${ENERGY_COLORS[activity.energy]}`}>{ENERGY_LABELS[activity.energy]}</span>
      </div>
      <p className="text-xs text-gray-400">~{activity.effortHrsPerWeek}h/wk</p>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(activity)} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-md hover:border-blue-300 text-gray-600">Edit</button>
        <button onClick={() => onMerge(activity)} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-md hover:border-blue-300 text-gray-600">Merge</button>
        <button onClick={flag} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-md hover:border-amber-300 text-gray-600">
          {activity.flagged ? 'Unflag' : 'Flag'}
        </button>
        <button onClick={remove} className="text-xs px-2 py-1 bg-white border border-red-200 rounded-md hover:bg-red-50 text-red-500">✕</button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type View = 'stream' | 'matrix' | 'grouped' | 'discussion';

export default function FacilitatorPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const sessionId = params.id;
  const token = searchParams.get('token') || (typeof window !== 'undefined' ? localStorage.getItem(`fac_token_${sessionId}`) || '' : '');

  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>('stream');
  const [editTarget, setEditTarget] = useState<Activity | null>(null);
  const [mergeTarget, setMergeTarget] = useState<Activity | null>(null);
  const [matrixSelected, setMatrixSelected] = useState<Activity | null>(null);
  const [filterVerdict, setFilterVerdict] = useState<string>('');
  const [filterEnergy, setFilterEnergy] = useState<string>('');
  const [groupSort, setGroupSort] = useState<'effort' | 'energy' | 'contributor'>('effort');
  const [showExport, setShowExport] = useState(false);
  const [discussionNote, setDiscussionNote] = useState('');
  const discussionNoteRef = useRef('');

  useEffect(() => { discussionNoteRef.current = discussionNote; }, [discussionNote]);

  const updateActivity = useCallback((updated: Activity) => {
    setSession((prev) => {
      if (!prev) return prev;
      const activities = prev.activities.map((a) => a.id === updated.id ? updated : a);
      return { ...prev, activities };
    });
  }, []);

  useEffect(() => {
    socket.connect();
    socket.emit('session:join', {
      sessionId,
      name: 'Facilitator',
      role: 'facilitator',
      facilitatorToken: token,
    });

    socket.on('session:state', (s: Session) => setSession(s));
    socket.on('session:participant_joined', (p: Participant) => {
      setSession((prev) => {
        if (!prev) return prev;
        const participants = [...prev.participants.filter((x) => x.id !== p.id), p];
        return { ...prev, participants };
      });
    });
    socket.on('session:participant_left', (id: string) => {
      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, participants: prev.participants.filter((p) => p.id !== id) };
      });
    });
    socket.on('activity:added', (a: Activity) => {
      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, activities: [...prev.activities.filter((x) => x.id !== a.id), a] };
      });
    });
    socket.on('activity:updated', updateActivity);
    socket.on('activity:deleted', (id: string) => {
      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, activities: prev.activities.filter((a) => a.id !== id) };
      });
      setEditTarget((prev) => prev?.id === id ? null : prev);
      setMergeTarget((prev) => prev?.id === id ? null : prev);
      setMatrixSelected((prev) => prev?.id === id ? null : prev);
    });
    socket.on('session:status_changed', ({ status }: { status: string }) => {
      setSession((prev) => prev ? { ...prev, status } : prev);
    });
    socket.on('discussion:index_changed', ({ index }: { index: number }) => {
      setSession((prev) => prev ? { ...prev, discussionIndex: index } : prev);
      setDiscussionNote('');
    });

    return () => {
      socket.off('session:state');
      socket.off('session:participant_joined');
      socket.off('session:participant_left');
      socket.off('activity:added');
      socket.off('activity:updated');
      socket.off('activity:deleted');
      socket.off('session:status_changed');
      socket.off('discussion:index_changed');
      socket.disconnect();
    };
  }, [sessionId, token, updateActivity]);

  // Keyboard shortcuts for discussion mode
  useEffect(() => {
    if (view !== 'discussion') return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === '1') classify('yes');
      if (e.key === '2') classify('maybe');
      if (e.key === '3') classify('no');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  const acts = session.activities;
  const classified = acts.filter((a) => a.autoVerdict !== null).length;
  const engineers = session.participants.filter((p) => !p.isFacilitator);
  const countByParticipant = Object.fromEntries(
    engineers.map((p) => [p.id, acts.filter((a) => a.authorId === p.id).length])
  );

  // Themes (simple word frequency)
  const wordFreq: Record<string, number> = {};
  acts.forEach((a) => a.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3).forEach((w) => { wordFreq[w] = (wordFreq[w] || 0) + 1; }));
  const themes = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w, c]) => ({ word: w, count: c }));

  const changeStatus = (status: string) => {
    socket.emit('session:status', { sessionId, status });
  };

  const classify = (verdict: string) => {
    if (!session) return;
    const currentId = session.discussionQueue[session.discussionIndex];
    if (!currentId) return;
    if (discussionNoteRef.current) {
      socket.emit('activity:edit', { sessionId, activityId: currentId, changes: { discussionNote: discussionNoteRef.current } });
    }
    socket.emit('activity:classify', { sessionId, activityId: currentId, verdict });
    socket.emit('discussion:navigate', { sessionId, direction: 'next' });
  };

  const flagCurrent = () => {
    if (!session) return;
    const currentId = session.discussionQueue[session.discussionIndex];
    if (!currentId) return;
    const act = acts.find((a) => a.id === currentId);
    if (!act) return;
    socket.emit('activity:flag', { sessionId, activityId: currentId, flagged: !act.flagged });
  };

  const navigate = (dir: 'prev' | 'skip') => {
    socket.emit('discussion:navigate', { sessionId, direction: dir });
  };

  const filteredActs = acts.filter((a) => {
    if (filterVerdict && (filterVerdict === 'unclassified' ? a.autoVerdict !== null : a.autoVerdict !== filterVerdict)) return false;
    if (filterEnergy && a.energy !== filterEnergy) return false;
    return true;
  });

  // ── STREAM VIEW ──────────────────────────────────────────────────────────
  const StreamView = () => (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* Left sidebar — participation */}
      <div className="w-40 shrink-0 bg-white rounded-xl border border-gray-100 p-3 overflow-y-auto">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Participation</p>
        {engineers.map((p) => (
          <div key={p.id} className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-700 truncate">{p.name}</span>
            <span className="text-xs font-mono text-gray-500 shrink-0 ml-1">{countByParticipant[p.id] || 0}</span>
          </div>
        ))}
      </div>

      {/* Center — activity cards */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3">
        {acts.length === 0 && <p className="text-sm text-gray-400 text-center mt-8">Waiting for activities…</p>}
        {acts.map((a) => (
          <FacilitatorCard key={a.id} activity={a} sessionId={sessionId}
            onEdit={setEditTarget} onMerge={setMergeTarget} />
        ))}
      </div>

      {/* Right — themes + effort dist */}
      <div className="w-52 shrink-0 bg-white rounded-xl border border-gray-100 p-3 overflow-y-auto">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Emerging themes</p>
        {themes.map((t) => (
          <div key={t.word} className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-700 capitalize">{t.word}</span>
            <span className="text-xs font-mono text-gray-400">{t.count}×</span>
          </div>
        ))}
        <div className="border-t border-gray-100 mt-3 pt-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Effort dist</p>
          {(['lt30','30to2h','halfday','fullday'] as const).map((t) => {
            const count = acts.filter((a) => a.tpo === t).length;
            return (
              <div key={t} className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 w-16">{TPO_LABELS[t]}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${acts.length ? (count / acts.length) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-gray-400">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── MATRIX VIEW ──────────────────────────────────────────────────────────
  const MatrixView = () => (
    <div className="flex gap-4 h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter chips */}
        <div className="flex gap-2 mb-3 flex-wrap shrink-0">
          <span className="text-xs text-gray-500 self-center">Filter:</span>
          {['', 'yes', 'maybe', 'no', 'unclassified'].map((v) => (
            <button key={v} onClick={() => setFilterVerdict(v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterVerdict === v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
              {v === '' ? 'All' : v === 'unclassified' ? 'Unclassified' : VERDICT_LABELS[v]}
            </button>
          ))}
          {['', 'drains', 'neutral', 'energizes'].map((e) => (
            <button key={e} onClick={() => setFilterEnergy(e)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterEnergy === e ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
              {e === '' ? 'All energy' : ENERGY_LABELS[e]}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 self-center">{classified} of {acts.length} classified</span>
        </div>

        {/* Matrix */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 relative overflow-hidden">
          {/* Quadrant labels */}
          <div className="absolute top-2 right-2 text-xs font-semibold text-red-400 opacity-60">PRIORITY</div>
          <div className="absolute top-2 left-2 text-xs font-semibold text-orange-400 opacity-60">TOLERABLE</div>
          <div className="absolute bottom-2 right-2 text-xs font-semibold text-blue-400 opacity-60">STRATEGIC</div>
          <div className="absolute bottom-2 left-2 text-xs font-semibold text-green-400 opacity-60">HEALTHY</div>
          {/* Axes */}
          <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-gray-200" />
          <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-200" />
          {/* Axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 pb-1">
            <span className="text-xs text-gray-300">0h/wk</span>
            <span className="text-xs text-gray-300">effort →</span>
            <span className="text-xs text-gray-300">8h+/wk</span>
          </div>

          {/* Dots */}
          {filteredActs.map((a) => {
            const x = effortX(a.effortHrsPerWeek);
            const y = energyY(a.energy);
            const color = a.autoVerdict ? VERDICT_COLORS[a.autoVerdict] : 'bg-gray-300';
            return (
              <button
                key={a.id}
                onClick={() => setMatrixSelected(a)}
                title={a.title}
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                className={`absolute w-4 h-4 rounded-full ${color} ${!a.autoVerdict ? 'border-2 border-dashed border-gray-400' : ''} hover:scale-150 transition-transform`}
              />
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {matrixSelected && (
        <div className="w-60 shrink-0 bg-white rounded-xl border border-gray-100 p-4 overflow-y-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Detail</p>
            <button onClick={() => setMatrixSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <FacilitatorCard activity={matrixSelected} sessionId={sessionId}
            onEdit={setEditTarget} onMerge={setMergeTarget} />
        </div>
      )}
    </div>
  );

  // ── GROUPED VIEW ─────────────────────────────────────────────────────────
  const GroupedView = () => {
    const sortFn = (a: Activity, b: Activity) => {
      if (groupSort === 'effort') return b.effortHrsPerWeek - a.effortHrsPerWeek;
      if (groupSort === 'energy') return ['drains','neutral','energizes'].indexOf(a.energy) - ['drains','neutral','energizes'].indexOf(b.energy);
      return a.authorName.localeCompare(b.authorName);
    };
    const groups: Record<string, Activity[]> = {
      yes: acts.filter((a) => a.autoVerdict === 'yes').sort(sortFn),
      maybe: acts.filter((a) => a.autoVerdict === 'maybe').sort(sortFn),
      no: acts.filter((a) => a.autoVerdict === 'no').sort(sortFn),
      unclassified: acts.filter((a) => a.autoVerdict === null).sort(sortFn),
    };
    const cols = [
      { key: 'unclassified', label: 'Unclassified', color: 'text-gray-500' },
      { key: 'yes', label: 'Automatable', color: 'text-emerald-600' },
      { key: 'maybe', label: 'Maybe', color: 'text-amber-600' },
      { key: 'no', label: 'Manual Forever', color: 'text-red-600' },
    ];

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex gap-2 mb-3 shrink-0 items-center">
          <span className="text-xs text-gray-500">Sort by:</span>
          {(['effort','energy','contributor'] as const).map((s) => (
            <button key={s} onClick={() => setGroupSort(s)}
              className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${groupSort === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-3 flex-1 overflow-hidden">
          {cols.map(({ key, label, color }) => (
            <div key={key} className="flex-1 flex flex-col overflow-hidden">
              <p className={`text-xs font-semibold ${color} mb-2 uppercase tracking-wide`}>
                {label} <span className="font-normal text-gray-400">({groups[key].length})</span>
              </p>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                {groups[key].map((a) => (
                  <FacilitatorCard key={a.id} activity={a} sessionId={sessionId}
                    onEdit={setEditTarget} onMerge={setMergeTarget} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── DISCUSSION VIEW ───────────────────────────────────────────────────────
  const DiscussionView = () => {
    const queue = session!.discussionQueue;
    const idx = session!.discussionIndex;
    const currentId = queue[idx];
    const currentAct = acts.find((a) => a.id === currentId);
    const remaining = queue.filter((id) => {
      const a = acts.find((x) => x.id === id);
      return a && a.autoVerdict === null;
    }).length;
    const flagged = acts.filter((a) => a.flagged);

    return (
      <div className="flex gap-4 h-full overflow-hidden">
        {/* Left: mini matrix + pending */}
        <div className="w-48 shrink-0 flex flex-col gap-3 overflow-hidden">
          <div className="bg-white rounded-xl border border-gray-100 p-2 h-36 relative">
            <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-gray-100" />
            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-100" />
            {acts.map((a) => {
              const x = effortX(a.effortHrsPerWeek);
              const y = energyY(a.energy);
              const color = a.autoVerdict ? VERDICT_COLORS[a.autoVerdict] : 'bg-gray-300';
              return (
                <div key={a.id}
                  style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
                  className={`absolute w-2 h-2 rounded-full ${color} ${a.id === currentId ? 'ring-2 ring-blue-500' : ''}`}
                />
              );
            })}
          </div>
          <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 overflow-y-auto">
            <p className="text-xs font-medium text-gray-400 mb-2">Pending ({remaining})</p>
            {queue.filter((id) => {
              const a = acts.find((x) => x.id === id);
              return a && a.autoVerdict === null && id !== currentId;
            }).slice(0, 10).map((id) => {
              const a = acts.find((x) => x.id === id);
              return a ? (
                <div key={id} className="text-xs text-gray-600 truncate mb-1">{a.title}</div>
              ) : null;
            })}
          </div>
        </div>

        {/* Center: Now Reviewing */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <p className="text-sm font-semibold text-gray-700">Now Reviewing</p>
            <p className="text-xs text-gray-400">{remaining} remaining</p>
          </div>

          {currentAct ? (
            <div className="bg-white rounded-2xl border-2 border-blue-100 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                  {initials(currentAct.authorName)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{currentAct.title}</p>
                  <p className="text-xs text-gray-400">{currentAct.authorName}</p>
                </div>
                <button onClick={flagCurrent} className={`ml-auto text-lg ${currentAct.flagged ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}>🚩</button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700">{TPO_LABELS[currentAct.tpo]}</span>
                <span className="text-sm px-3 py-1 rounded-full bg-purple-50 text-purple-700">{FREQ_LABELS[currentAct.frequency]}</span>
                <span className={`text-sm px-3 py-1 rounded-full border ${ENERGY_COLORS[currentAct.energy]}`}>{ENERGY_LABELS[currentAct.energy]}</span>
                <span className="text-sm px-3 py-1 rounded-full bg-gray-50 text-gray-600">~{currentAct.effortHrsPerWeek}h/wk</span>
              </div>

              {/* Classify buttons */}
              <div className="flex gap-3">
                {[
                  { v: 'yes', l: 'Yes — Automatable', k: '1', cls: 'bg-emerald-600 hover:bg-emerald-700' },
                  { v: 'maybe', l: 'Maybe', k: '2', cls: 'bg-amber-500 hover:bg-amber-600' },
                  { v: 'no', l: 'No — Manual', k: '3', cls: 'bg-red-500 hover:bg-red-600' },
                ].map((btn) => (
                  <button key={btn.v} onClick={() => classify(btn.v)}
                    className={`flex-1 py-2.5 text-white text-sm font-medium rounded-xl transition-colors ${btn.cls}`}>
                    <span className="text-xs opacity-70">[{btn.k}]</span> {btn.l}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Discussion note</label>
                <textarea
                  value={discussionNote}
                  onChange={(e) => setDiscussionNote(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-center">
                <button onClick={() => navigate('prev')} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-blue-300">← Prev</button>
                <button onClick={() => navigate('skip')} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-blue-300">Skip →</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {queue.length === 0 ? 'No activities in queue' : 'All activities classified!'}
            </div>
          )}
        </div>

        {/* Right: Flagged rail */}
        <div className="w-48 shrink-0 bg-white rounded-xl border border-gray-100 p-3 overflow-y-auto">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Flagged ({flagged.length})</p>
          {flagged.map((a) => (
            <div key={a.id} className="mb-2 pb-2 border-b border-gray-50 last:border-0">
              <p className="text-xs font-medium text-gray-700 truncate">{a.title}</p>
              <p className="text-xs text-gray-400">{a.authorName}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const canDiscuss = session.status === 'reviewing';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-4">
        <h1 className="text-sm font-semibold text-gray-800 mr-2">{session.name}</h1>

        {/* View tabs */}
        {(['stream','matrix','grouped'] as View[]).concat(canDiscuss ? ['discussion' as View] : []).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`text-sm font-medium capitalize transition-colors ${view === v ? 'text-blue-600 border-b-2 border-blue-600 pb-0.5' : 'text-gray-500 hover:text-gray-700'}`}>
            {v === 'stream' ? 'Live stream' : v}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Session controls */}
          {session.status === 'lobby' && (
            <button onClick={() => changeStatus('open')}
              className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">
              Start session
            </button>
          )}
          {session.status === 'open' && (
            <>
              <button onClick={() => socket.emit('session:extend_window', { sessionId, minutes: 2 })}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:border-blue-300 text-gray-600">
                +2 min
              </button>
              <button onClick={() => socket.emit('session:extend_window', { sessionId, minutes: 5 })}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:border-blue-300 text-gray-600">
                +5 min
              </button>
              <button onClick={() => changeStatus('reviewing')}
                className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600">
                End submission & Review
              </button>
            </>
          )}
          {session.status === 'reviewing' && (
            <button onClick={() => { setView('discussion'); }}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">
              Discussion mode
            </button>
          )}

          <button onClick={() => setShowExport(true)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:border-blue-300 text-gray-600">
            Export
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden p-4">
        {view === 'stream' && <StreamView />}
        {view === 'matrix' && <MatrixView />}
        {view === 'grouped' && <GroupedView />}
        {view === 'discussion' && <DiscussionView />}
      </div>

      {/* Dialogs */}
      {editTarget && <EditDialog activity={editTarget} sessionId={sessionId} onClose={() => setEditTarget(null)} />}
      {mergeTarget && (
        <MergeDialog
          source={mergeTarget}
          allActivities={acts}
          sessionId={sessionId}
          onClose={() => setMergeTarget(null)}
        />
      )}
      {showExport && <ExportModal session={session} onClose={() => setShowExport(false)} />}
    </div>
  );
}
