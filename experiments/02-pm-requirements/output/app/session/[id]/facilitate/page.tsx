'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { socket } from '@/lib/socket';

type Session = { id: string; name: string };
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
type Filters = { timeEstimate: string[]; enjoyment: string[]; repetitiveness: string[] };

const AUTO_GROUPS = ['yes', 'maybe', 'no'] as const;

const GROUP_META: Record<string, { label: string; style: string }> = {
  yes:   { label: 'High Automation Potential', style: 'text-green-700 bg-green-50 border-green-200' },
  maybe: { label: 'Possible Automation',       style: 'text-amber-700 bg-amber-50 border-amber-200' },
  no:    { label: 'Low / No Automation',        style: 'text-gray-500 bg-gray-50 border-gray-200' },
};

export default function FacilitatePage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filters, setFilters] = useState<Filters>({ timeEstimate: [], enjoyment: [], repetitiveness: [] });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) { setNotFound(true); return; }
        setSession(data.session);
        setActivities(data.activities);
      });

    socket.connect();
    socket.emit('session:observe', { sessionId: id });

    socket.on('activity:added', (a: Activity) => {
      setActivities((prev) => [...prev, a]);
    });
    socket.on('activity:flagged', ({ activityId, flagged }: { activityId: string; flagged: boolean }) => {
      setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, flagged } : a)));
    });

    return () => {
      socket.off('activity:added');
      socket.off('activity:flagged');
      socket.disconnect();
    };
  }, [id]);

  const toggleFlag = async (activityId: string) => {
    await fetch(`/api/activities/${activityId}/flag`, { method: 'PATCH' });
    // Socket event updates local state.
  };

  const exportFlagged = async () => {
    const res = await fetch(`/api/sessions/${id}/export`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toil-${id}-flagged.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/session/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFilter = (cat: keyof Filters, val: string) => {
    setFilters((prev) => ({
      ...prev,
      [cat]: prev[cat].includes(val) ? prev[cat].filter((v) => v !== val) : [...prev[cat], val],
    }));
  };

  const clearFilters = () => setFilters({ timeEstimate: [], enjoyment: [], repetitiveness: [] });

  const filtered = activities.filter((a) => {
    if (filters.timeEstimate.length && !filters.timeEstimate.includes(a.timeEstimate)) return false;
    if (filters.enjoyment.length && !filters.enjoyment.includes(a.enjoyment)) return false;
    if (filters.repetitiveness.length && !filters.repetitiveness.includes(a.repetitiveness)) return false;
    return true;
  });

  const flaggedCount = activities.filter((a) => a.flagged).length;
  const activeFilterCount = filters.timeEstimate.length + filters.enjoyment.length + filters.repetitiveness.length;

  if (notFound) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Session not found.</p>
    </main>
  );

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-semibold text-gray-900">{session.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Facilitator view · {activities.length} activities · {flaggedCount} flagged
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="border border-gray-200 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            {copied ? 'Copied!' : 'Copy engineer link'}
          </button>
          <button
            onClick={exportFlagged}
            disabled={flaggedCount === 0}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2
                       text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export flagged ({flaggedCount})
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Filter sidebar */}
        <aside className="w-52 bg-white border-r border-gray-100 p-4 shrink-0 overflow-y-auto">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Filters</p>

          <FilterGroup label="Time estimate" cat="timeEstimate" opts={['quick', 'medium', 'significant']} filters={filters} toggle={toggleFilter} />
          <FilterGroup label="Enjoyment"     cat="enjoyment"     opts={['yes', 'meh', 'no']}              filters={filters} toggle={toggleFilter} />
          <FilterGroup label="Repetitive"    cat="repetitiveness" opts={['yes', 'sometimes', 'no']}       filters={filters} toggle={toggleFilter} />

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline">
              Clear all filters
            </button>
          )}
        </aside>

        {/* Board — 3 columns by automation potential */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-3 gap-6 min-w-[640px]">
            {AUTO_GROUPS.map((group) => {
              const items = filtered.filter((a) => a.automationPotential === group);
              const { label, style } = GROUP_META[group];
              return (
                <section key={group}>
                  <div className={`rounded-lg border px-3 py-2 mb-4 ${style}`}>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-xs opacity-70">{items.length} activit{items.length === 1 ? 'y' : 'ies'}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {items.length === 0 ? (
                      <p className="text-xs text-gray-300 text-center py-6">None</p>
                    ) : (
                      items.map((a) => (
                        <ActivityCard key={a.id} activity={a} onFlag={() => toggleFlag(a.id)} />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterGroup({ label, cat, opts, filters, toggle }: {
  label: string;
  cat: keyof Filters;
  opts: string[];
  filters: Filters;
  toggle: (cat: keyof Filters, val: string) => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      <div className="flex flex-col gap-1">
        {opts.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(cat, opt)}
            className={`text-left text-xs px-2 py-1 rounded transition-colors ${
              filters[cat].includes(opt)
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActivityCard({ activity: a, onFlag }: { activity: Activity; onFlag: () => void }) {
  const enjoyLabel = a.enjoyment === 'yes' ? 'enjoys' : a.enjoyment === 'meh' ? 'meh' : "doesn't enjoy";
  const repeatLabel = a.repetitiveness === 'yes' ? 'repetitive' : a.repetitiveness === 'sometimes' ? 'sometimes' : 'not repetitive';

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${a.flagged ? 'border-amber-300 bg-amber-50' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 leading-tight">{a.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{a.authorName}</p>
        </div>
        <button
          onClick={onFlag}
          className={`shrink-0 text-xs px-2 py-1 rounded-full transition-colors ${
            a.flagged
              ? 'bg-amber-200 text-amber-800 hover:bg-amber-300'
              : 'bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700'
          }`}
        >
          {a.flagged ? 'Unflag' : 'Flag'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip label={a.timeEstimate} />
        <Chip label={enjoyLabel} />
        <Chip label={repeatLabel} />
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{label}</span>
  );
}
