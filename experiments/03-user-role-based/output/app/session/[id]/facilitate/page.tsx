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

const DURATION_LABELS: Record<Duration, string> = { quick: 'Quick', medium: 'Medium', significant: 'Significant' };

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-orange-100 text-orange-700 border-orange-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_FLOW: SessionState['status'][] = ['open', 'reviewing', 'closed'];
const STATUS_LABELS: Record<string, string> = { open: 'Open', reviewing: 'Reviewing', closed: 'Closed' };
const STATUS_NEXT: Record<string, string> = { open: 'Switch to Reviewing', reviewing: 'Close Session', closed: '' };

export default function FacilitatePage({ params }: { params: { id: string } }) {
  const sessionId = params.id;
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState('');

  const updateActivity = useCallback((updated: Activity) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, activities: prev.activities.map(a => a.id === updated.id ? updated : a) };
    });
  }, []);

  useEffect(() => {
    socket.connect();
    socket.emit('session:facilitate', { sessionId });

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
  }, [sessionId, updateActivity]);

  const advanceStatus = () => {
    if (!session) return;
    const idx = STATUS_FLOW.indexOf(session.status);
    if (idx < STATUS_FLOW.length - 1) {
      const next = STATUS_FLOW[idx + 1];
      socket.emit('session:set_status', { sessionId, status: next });
    }
  };

  const setPriority = (activityId: string, priority: Priority | undefined) => {
    socket.emit('activity:update', { sessionId, activityId, priority });
  };

  const toggleFlag = (activityId: string, flagged: boolean) => {
    socket.emit('activity:update', { sessionId, activityId, flagged });
  };

  const exportSession = async () => {
    const res = await fetch(`/api/sessions/${sessionId}/export`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toil-tracker-${sessionId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  if (!session) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Loading…</p></main>;
  }

  const groups: { label: string; key: Automatable; desc: string }[] = [
    { key: 'yes', label: 'Strong candidates', desc: 'Automatable' },
    { key: 'maybe', label: 'Possible candidates', desc: 'Maybe automatable' },
    { key: 'no', label: 'Not automatable', desc: 'Manual / keep' },
  ];

  const prioritized = session.activities.filter(a => a.priority);
  const nextLabel = STATUS_NEXT[session.status];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{session.title}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <StatusBadge status={session.status} />
            <span className="text-xs text-gray-400">{session.participants.length} participant{session.participants.length !== 1 ? 's' : ''}</span>
            <span className="text-xs text-gray-400">{session.activities.length} activities</span>
            <span className="text-xs text-gray-400">{prioritized.length} prioritized</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nextLabel && (
            <button
              onClick={advanceStatus}
              className="bg-gray-800 hover:bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {nextLabel}
            </button>
          )}
          <button
            onClick={exportSession}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Export
          </button>
        </div>
      </header>

      {/* Groups */}
      <div className="p-6 space-y-8">
        {groups.map(g => {
          const activities = session.activities
            .filter(a => a.automatable === g.key)
            .sort((a, b) => {
              const order = { significant: 0, medium: 1, quick: 2 };
              return order[a.duration] - order[b.duration];
            });

          return (
            <section key={g.key}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-700">{g.label}</h2>
                <span className="text-xs text-gray-400">({activities.length})</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  g.key === 'yes' ? 'bg-green-100 text-green-700' :
                  g.key === 'maybe' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{g.desc}</span>
              </div>

              {activities.length === 0 ? (
                <p className="text-xs text-gray-400 ml-1">None yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {activities.map(a => (
                    <ActivityCard
                      key={a.id}
                      activity={a}
                      onPriority={setPriority}
                      onFlag={toggleFlag}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ActivityCard({
  activity: a,
  onPriority,
  onFlag,
}: {
  activity: Activity;
  onPriority: (id: string, p: Priority | undefined) => void;
  onFlag: (id: string, f: boolean) => void;
}) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${a.flagged ? 'border-orange-300' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-800 leading-snug">{a.title}</p>
        <button
          onClick={() => onFlag(a.id, !a.flagged)}
          title={a.flagged ? 'Unflag' : 'Flag'}
          className={`shrink-0 text-sm transition-colors ${a.flagged ? 'text-orange-500' : 'text-gray-300 hover:text-orange-400'}`}
        >
          ⚑
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-3">{a.authorName} · {DURATION_LABELS[a.duration]}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        <Tag label={`enjoy: ${a.enjoyment}`} />
        <Tag label={`rep: ${a.repetitive}`} />
      </div>

      {/* Priority selector */}
      <div className="flex gap-1 flex-wrap">
        {(['high', 'medium', 'low'] as Priority[]).map(p => (
          <button
            key={p}
            onClick={() => onPriority(a.id, a.priority === p ? undefined : p)}
            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              a.priority === p
                ? PRIORITY_COLORS[p]
                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
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
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? colors.open}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function Tag({ label }: { label: string }) {
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">{label}</span>;
}
