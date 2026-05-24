'use client';

import { useEffect, useState } from 'react';
import type { Activity } from '@/lib/domain/types';
import {
  emitActivityDelete,
  emitSessionClose,
  emitSessionExtend,
  emitSessionStart,
} from '@/lib/socket';
import { Brand, TimerDisplay, Topbar } from '@/components/ui';
import { useTimer } from '@/hooks/useTimer';
import { useSessionContext, SessionConnectionFallback } from '@/hooks/useSession';
import { LiveView } from './LiveView';
import { MatrixView } from './MatrixView';
import { GroupedView } from './GroupedView';
import { DiscussView } from './DiscussView';
import { EditModal } from './EditModal';
import { MergeModal } from './MergeModal';
import { ExportModal } from './ExportModal';

type View = 'live' | 'matrix' | 'grouped' | 'discuss';

export function FacilitatorHub({ sessionId, token }: { sessionId: string; token: string }) {
  const { session, loading, joinError, retryJoin } = useSessionContext();
  const [view, setView] = useState<View>('live');
  const [selected, setSelected] = useState<Activity | null>(null);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [mergeActivity, setMergeActivity] = useState<Activity | null>(null);
  const [showExport, setShowExport] = useState(false);

  const { display, urgent, snapExtend } = useTimer(
    session?.startedAt,
    session?.submissionWindowMin ?? 0,
  );

  useEffect(() => {
    if (session?.status === 'discussion') setView('discuss');
  }, [session?.status]);

  const extend = (mins: number) => {
    snapExtend(mins);
    emitSessionExtend({ sessionId, token, addMinutes: mins });
  };

  const closeSession = () => {
    emitSessionClose({ sessionId, token });
  };

  const startSession = async () => {
    emitSessionStart({ sessionId, token });
    await fetch(`/api/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  };

  const deleteActivity = (a: Activity) => {
    if (!window.confirm(`Remove "${a.title}" from this session?`)) return;
    emitActivityDelete({ sessionId, activityId: a.id, token });
    if (selected?.id === a.id) setSelected(null);
  };

  if (joinError) {
    return (
      <SessionConnectionFallback message={joinError} onRetry={retryJoin} />
    );
  }

  if (loading || !session) {
    return (
      <div className="wa-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        Connecting…
      </div>
    );
  }

  const visible = session.activities.filter((a) => !a.isMergedSource);
  const classified = visible.filter((a) => a.teamAuto !== 'unclassified');
  const flagged = visible.filter((a) => a.flagged);
  const showTimer = session.status === 'active' && session.submissionWindowMin > 0;
  let subtitle = `FACILITATOR · ${visible.length} activities`;
  if (classified.length > 0) {
    subtitle += ` · ${classified.length}/${visible.length} classified`;
  }
  if (flagged.length > 0) {
    subtitle += ` · ${flagged.length} flagged`;
  }

  return (
    <div className="wa-screen">
      <Topbar
        left={
          <>
            <Brand />
            <div style={{ height: 20, width: 1, background: 'var(--rule)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{session.name}</div>
              <div className="wa-eyebrow" style={{ fontSize: 10 }}>
                {subtitle}
              </div>
            </div>
          </>
        }
        right={
          <>
            <TimerDisplay display={display} urgent={urgent} show={showTimer} />
            {showTimer && (
              <>
                <button type="button" className="wa-btn is-ghost" onClick={() => extend(2)}>
                  +2 min
                </button>
                <button type="button" className="wa-btn is-ghost" onClick={() => extend(5)}>
                  +5 min
                </button>
              </>
            )}
            {session.status === 'lobby' && (
              <button type="button" className="wa-btn is-rust" onClick={startSession}>
                Start submissions →
              </button>
            )}
            {session.status === 'active' && (
              <button type="button" className="wa-btn" onClick={closeSession}>
                End → start discussion
              </button>
            )}
            <div style={{ width: 1, height: 16, background: 'var(--rule)' }} />
            <div className="wa-tabs">
              {(['live', 'matrix', 'grouped', 'discuss'] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={view === v ? 'is-on' : ''}
                  onClick={() => setView(v)}
                >
                  {v === 'live' ? 'Live' : v === 'matrix' ? '⊞ Matrix' : v === 'grouped' ? '≡ Grouped' : '★ Discuss'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="wa-btn is-ghost"
              style={{ position: 'relative' }}
              onClick={() => setShowExport(true)}
            >
              Export ↗
              {flagged.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'var(--rust)',
                    color: '#fff',
                    fontSize: 9,
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid var(--cream)',
                  }}
                >
                  {flagged.length}
                </span>
              )}
            </button>
          </>
        }
      />
      {view === 'live' && (
        <LiveView
          session={session}
          onEdit={setEditActivity}
          onMerge={setMergeActivity}
          onDelete={deleteActivity}
        />
      )}
      {view === 'matrix' && (
        <MatrixView
          session={session}
          selected={selected}
          onSelect={setSelected}
          token={token}
          onEdit={setEditActivity}
          onMerge={setMergeActivity}
          onDelete={deleteActivity}
        />
      )}
      {view === 'grouped' && (
        <GroupedView
          session={session}
          onEdit={setEditActivity}
          onMerge={setMergeActivity}
          onDelete={deleteActivity}
        />
      )}
      {view === 'discuss' && (
        <DiscussView
          session={session}
          token={token}
          onEdit={setEditActivity}
          onMerge={setMergeActivity}
          onDelete={deleteActivity}
        />
      )}
      {editActivity && (
        <EditModal
          activity={editActivity}
          sessionId={sessionId}
          token={token}
          facilitatorName={session.facilitatorName || 'Facilitator'}
          onClose={() => setEditActivity(null)}
        />
      )}
      {mergeActivity && (
        <MergeModal
          source={mergeActivity}
          session={session}
          token={token}
          onClose={() => setMergeActivity(null)}
        />
      )}
      {showExport && (
        <ExportModal
          sessionId={sessionId}
          sessionName={session.name}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
