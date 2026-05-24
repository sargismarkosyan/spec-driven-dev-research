'use client';

import { useMemo, useState } from 'react';
import type { Participant, SerializedSession } from '@/lib/domain/types';
import type { Freq, Tpo } from '@/lib/domain/enums';
import { computeSuggestions } from '@/lib/domain/suggestions';
import { useTimer } from '@/hooks/useTimer';
import { useSoftDelete } from '@/hooks/useSoftDelete';
import { Avatar, TimerDisplay, Topbar, UndoToast } from '@/components/ui';
import { PromptRail } from '@/components/engineer/PromptRail';
import { AddActivityForm, type ActivityFormPrefill } from '@/components/engineer/AddActivityForm';
import { ActivityCard, FlaggedPriorityCard } from '@/components/engineer/ActivityCard';
import { Suggestions } from '@/components/engineer/Suggestions';
import { TeamFeed } from '@/components/engineer/TeamFeed';

function EngineerTopbar({
  session,
  subtitle,
  participant,
  activityCount,
  classificationSummary,
  showTimer,
  timerDisplay,
  timerUrgent,
}: {
  session: SerializedSession;
  subtitle: string;
  participant?: Participant;
  activityCount?: number;
  classificationSummary?: string;
  showTimer?: boolean;
  timerDisplay?: string | null;
  timerUrgent?: boolean;
}) {
  return (
    <Topbar
      left={
        <h1 className="wa-display" style={{ fontSize: 18, margin: 0, fontWeight: 500 }}>
          {session.name}
        </h1>
      }
      center={<span className="wa-tick">{subtitle}</span>}
      right={
        <>
          <TimerDisplay display={timerDisplay ?? null} urgent={!!timerUrgent} show={!!showTimer} />
          {classificationSummary && (
            <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {classificationSummary}
            </span>
          )}
          {activityCount !== undefined && participant && !classificationSummary && (
            <>
              <span className="wa-tick">{activityCount} activities</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar initials={participant.initials} color={participant.color} />
                <span style={{ fontSize: 13 }}>{participant.name}</span>
              </div>
            </>
          )}
          {participant && classificationSummary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar initials={participant.initials} color={participant.color} />
              <span style={{ fontSize: 13 }}>{participant.name}</span>
            </div>
          )}
        </>
      }
    />
  );
}

export function EngineerBoard({
  session,
  participantId,
  name,
}: {
  session: SerializedSession;
  participantId: string;
  name: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formPrefill, setFormPrefill] = useState<ActivityFormPrefill>({
    title: '',
    tpo: '30m-2h',
    freq: 'weekly',
    energy: 'fine',
  });
  const { pendingId, pendingTitle, drainProgress, softDelete, undo } = useSoftDelete(session.id);

  const me = session.participants.find((p) => p.id === participantId);

  const { display, urgent } = useTimer(session.startedAt, session.submissionWindowMin ?? 0);
  const showTimer = session.status === 'active' && session.submissionWindowMin > 0;

  const myActivities = useMemo(
    () =>
      session.activities.filter(
        (a) => !a.isMergedSource && a.participantId === participantId,
      ),
    [session.activities, participantId],
  );

  const teamFeed = useMemo(() => {
    if (!session.liveTeamFeed) return [];
    return session.activities
      .filter((a) => !a.isMergedSource && a.participantId !== participantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [session, participantId]);

  const suggestions = useMemo(
    () => computeSuggestions(teamFeed, myActivities),
    [teamFeed, myActivities],
  );

  const openBlankForm = () => {
    setFormPrefill({
      title: '',
      tpo: '30m-2h',
      freq: 'weekly',
      energy: 'fine',
    });
    setShowForm(true);
  };

  const openPromptForm = (title: string, tpo: Tpo, freq: Freq) => {
    setFormPrefill({
      title,
      tpo,
      freq,
      energy: 'fine',
    });
    setShowForm(true);
  };

  const openSuggestionForm = (title: string) => {
    setFormPrefill({
      title,
      tpo: null,
      freq: null,
      energy: null,
    });
    setShowForm(true);
  };

  if (session.status === 'lobby') {
    const participants = session.participants;

    return (
      <div className="wa-screen">
        <EngineerTopbar session={session} subtitle="ENGINEER VIEW · WAITING TO START" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 48 }}>
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.25 }}>◌</div>
            <h2 className="wa-display" style={{ fontSize: 28, margin: '0 0 12px', fontWeight: 500 }}>
              Waiting for the session to start.
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
              The session is open — you&apos;re in. Submissions will begin as soon as the facilitator
              hits &quot;Start submissions&quot; in the lobby. You&apos;ll see the board automatically.
            </p>
          </div>
          {participants.length > 0 && (
            <div style={{ width: '100%', maxWidth: 380 }}>
              <div className="wa-eyebrow" style={{ marginBottom: 12, textAlign: 'center' }}>
                {participants.length} {participants.length === 1 ? 'person' : 'people'} in the room
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {participants.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 4 }}>
                    <Avatar initials={p.initials} color={p.color} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</span>
                    <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (session.status === 'discussion' || session.status === 'done') {
    const allActivities = session.activities;
    const total = allActivities.length;
    const classified = allActivities.filter((a) => a.teamAuto !== 'unclassified').length;
    const unclassifiedCount = total - classified;
    const flagged = allActivities.filter((a) => a.flagged);
    const myDiscussionActivities = allActivities.filter((a) => a.participantId === participantId);

    return (
      <div className="wa-screen">
        <EngineerTopbar
          session={session}
          subtitle="DISCUSSION IN PROGRESS"
          participant={me}
          classificationSummary={`${classified}/${total} classified`}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 296px', flex: 1, overflow: 'hidden' }}>
          <div className="wa-col-scroll" style={{ padding: 24 }}>
            <p className="wa-eyebrow" style={{ margin: '0 0 8px' }}>
              Your submitted activities
            </p>
            <h2 className="wa-display" style={{ fontSize: 22, margin: '0 0 20px', fontWeight: 500 }}>
              Discussion is live — verdicts appearing in real time.
            </h2>
            {myDiscussionActivities.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>You didn&apos;t submit any activities.</p>
            ) : (
              myDiscussionActivities.map((a, i) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  index={i + 1}
                  editable={false}
                  sessionId={session.id}
                />
              ))
            )}
            <div
              style={{
                marginTop: 20,
                padding: 12,
                background: 'var(--paper-deep)',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--muted)',
                lineHeight: 1.5,
              }}
            >
              The facilitator is walking through each activity with the team and deciding on
              automatability. You&apos;ll see verdicts and flags appear above as they happen.
            </div>
          </div>
          <div className="wa-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p
                className="wa-eyebrow"
                style={{ margin: 0, color: flagged.length > 0 ? 'var(--rust)' : undefined }}
              >
                ★ Flagged priorities
              </p>
              <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                {flagged.length}
              </span>
            </div>
            {flagged.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
                None flagged yet — the list grows as the facilitator marks priorities.
              </p>
            )}
            {flagged.map((a, i) => (
              <FlaggedPriorityCard key={a.id} activity={a} index={i + 1} />
            ))}
            <hr className="wa-rule" style={{ margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="wa-eyebrow" style={{ margin: 0 }}>
                Progress
              </p>
              <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                {classified}/{total}
              </span>
            </div>
            <div style={{ background: 'var(--paper-deep)', borderRadius: 4, height: 6, marginTop: 8 }}>
              <div
                style={{
                  background: 'var(--ink)',
                  height: '100%',
                  borderRadius: 4,
                  width: `${total ? (classified / total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 8 }}>
              {unclassifiedCount} activities still to review.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const showQuickEditHint = myActivities.length >= 1 && !showForm;

  return (
    <div className="wa-screen">
      <EngineerTopbar
        session={session}
        subtitle="ENGINEER VIEW · IN PROGRESS"
        participant={me}
        activityCount={myActivities.length}
        showTimer={showTimer}
        timerDisplay={display}
        timerUrgent={urgent}
      />
      <div className="wa-layout-3col-engineer">
        <PromptRail
          session={session}
          onExample={(t, tp, fr) => openPromptForm(t, tp ?? '30m-2h', fr ?? 'weekly')}
        />
        <div className="wa-col-scroll" style={{ padding: 16 }}>
          {myActivities.length === 0 && !showForm && (
            <>
              <h2 className="wa-display" style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 500 }}>
                List the recurring work you do.
              </h2>
              <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.55, maxWidth: 580, marginBottom: 28 }}>
                One activity per card. Be specific but quick — &quot;Triage Sentry alerts&quot; not &quot;deal with errors.&quot;
                Three questions per card. You can edit anything before discussion starts.
              </p>
            </>
          )}
          {showQuickEditHint && (
            <div className="wa-quick-hint">
              <span className="wa-mono">↳</span>
              <span>Tap any answer to change it. Hover a title to rename.</span>
            </div>
          )}
          {myActivities.map((a, i) =>
            pendingId === a.id ? null : (
              <ActivityCard
                key={a.id}
                activity={a}
                index={i + 1}
                editable
                sessionId={session.id}
                onSoftDelete={softDelete}
              />
            ),
          )}
          {showForm ? (
            <AddActivityForm
              sessionId={session.id}
              name={name}
              count={myActivities.length}
              prefill={formPrefill}
              onSaved={(andAnother) => {
                if (!andAnother) setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              type="button"
              onClick={openBlankForm}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: myActivities.length === 0 ? '22px 22px' : '14px 18px',
                background: '#fff',
                border: '1.5px dashed var(--rule)',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 12,
                color: 'var(--muted)',
              }}
            >
              <span style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--ink)',
                color: 'var(--cream)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                flexShrink: 0,
              }}>+</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                  {myActivities.length === 0 ? 'Add your first activity' : 'Add another activity'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {myActivities.length === 0 ? 'Start with what you did yesterday or this morning' : 'Keep listing — aim for 5+'}
                </div>
              </div>
              <span className="wa-mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-2)' }}>↵</span>
            </button>
          )}
          {myActivities.length > 0 && !showForm && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 4,
              padding: '12px 14px',
              background: 'var(--sage-bg)',
              borderRadius: 4,
              border: '1px solid #c8d2b1',
            }}>
              <span style={{ color: 'var(--sage)', fontSize: 14 }}>✓</span>
              <span style={{ fontSize: 13, color: '#3b4a2b' }}>
                You&apos;re done. Tweak anything until the facilitator starts the discussion.
              </span>
            </div>
          )}
        </div>
        <div className="wa-sidebar">
          {session.liveTeamFeed && (
            <Suggestions suggestions={suggestions} onSelect={openSuggestionForm} />
          )}
          <TeamFeed activities={teamFeed} enabled={session.liveTeamFeed} />
        </div>
      </div>
      {pendingId && (
        <UndoToast title={pendingTitle ?? undefined} onUndo={undo} progress={drainProgress} />
      )}
    </div>
  );
}
