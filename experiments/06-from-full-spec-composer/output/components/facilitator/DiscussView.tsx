'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Activity, SerializedSession } from '@/lib/domain/types';
import { TEAM_AUTO_LABELS } from '@/lib/domain/enums';
import { perceivedCostForActivity } from '@/lib/domain/calculations';
import { jaccardSimilarity } from '@/lib/domain/merge';
import {
  emitActivityClassify,
  emitActivityFlag,
  emitActivityNote,
} from '@/lib/socket';
import { ActivityChipsShort } from '@/components/ActivityChipsShort';
import { EffortPill } from '@/components/EffortPill';
import { Avatar, ClassifyBtn, FacActions } from '@/components/ui';
import { MatrixPlot } from './MatrixPlot';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

export function DiscussView({
  session,
  token,
  onEdit,
  onMerge,
  onDelete,
}: {
  session: SerializedSession;
  token: string;
  onEdit: (a: Activity) => void;
  onMerge: (a: Activity) => void;
  onDelete: (a: Activity) => void;
}) {
  const visible = session.activities.filter((a) => !a.isMergedSource);
  const classified = visible.filter((a) => a.teamAuto !== 'unclassified');
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [noteDraft, setNoteDraft] = useState('');

  const pending = useMemo(() => {
    const unclassified = visible.filter((a) => a.teamAuto === 'unclassified');
    const skipped = new Set(skippedIds);
    const active = unclassified
      .filter((a) => !skipped.has(a.id))
      .sort((a, b) => perceivedCostForActivity(b) - perceivedCostForActivity(a));
    const deferred = unclassified
      .filter((a) => skipped.has(a.id))
      .sort((a, b) => perceivedCostForActivity(b) - perceivedCostForActivity(a));
    return [...active, ...deferred];
  }, [visible, skippedIds]);

  const current = pending[idx] ?? null;
  const skippedCount = skippedIds.filter((id) =>
    visible.some((a) => a.id === id && a.teamAuto === 'unclassified'),
  ).length;

  const flagged = visible.filter((a) => a.flagged);

  const similar = useMemo(() => {
    if (!current) return [];
    return visible
      .filter((a) => a.id !== current.id && a.participantId !== current.participantId)
      .map((a) => ({ activity: a, score: jaccardSimilarity(current.title, a.title) }))
      .filter(({ score }) => score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [current, visible]);

  useEffect(() => {
    setNoteDraft(current?.discussionNote ?? '');
  }, [current?.id, current?.discussionNote]);

  useEffect(() => {
    if (idx >= pending.length && pending.length > 0) {
      setIdx(pending.length - 1);
    }
  }, [idx, pending.length]);

  const classify = (verdict: 'yes' | 'maybe' | 'no') => {
    if (!current) return;
    emitActivityClassify({
      sessionId: session.id,
      activityId: current.id,
      verdict,
      token,
    });
  };

  const toggleFlag = () => {
    if (!current) return;
    emitActivityFlag({
      sessionId: session.id,
      activityId: current.id,
      token,
      flagged: !current.flagged,
    });
  };

  const saveNote = () => {
    if (!current) return;
    if (noteDraft !== (current.discussionNote ?? '')) {
      emitActivityNote({
        sessionId: session.id,
        activityId: current.id,
        token,
        note: noteDraft,
      });
    }
  };

  const skip = () => {
    if (!current) return;
    setSkippedIds((ids) => (ids.includes(current.id) ? ids : [...ids, current.id]));
    setIdx((i) => Math.min(i, Math.max(0, pending.length - 2)));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'j' || e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      if (e.key === 'k' || e.key === 'ArrowRight') {
        setIdx((i) => Math.min(Math.max(0, pending.length - 1), i + 1));
      }
      if (e.key === 's') {
        if (!current) return;
        setSkippedIds((ids) => (ids.includes(current.id) ? ids : [...ids, current.id]));
        setIdx((i) => Math.min(i, Math.max(0, pending.length - 2)));
      }
      if (!current) return;
      if (e.key === '1') {
        emitActivityClassify({
          sessionId: session.id,
          activityId: current.id,
          verdict: 'yes',
          token,
        });
      }
      if (e.key === '2') {
        emitActivityClassify({
          sessionId: session.id,
          activityId: current.id,
          verdict: 'maybe',
          token,
        });
      }
      if (e.key === '3') {
        emitActivityClassify({
          sessionId: session.id,
          activityId: current.id,
          verdict: 'no',
          token,
        });
      }
      if (e.key === 'f') {
        emitActivityFlag({
          sessionId: session.id,
          activityId: current.id,
          token,
          flagged: !current.flagged,
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, pending.length, session.id, token]);

  const currentReviewIndex = current ? idx + 1 : 0;
  const progressPct = visible.length > 0 ? (classified.length / visible.length) * 100 : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: 16, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <p className="wa-eyebrow" style={{ margin: 0 }}>
            Discussion · tagging automatability + flagging priorities
          </p>
          <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>
            ↳ {classified.length} / {visible.length} classified
          </span>
          <div
            style={{
              width: 120,
              height: 6,
              background: 'var(--paper-deep)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: 'var(--ink)',
                borderRadius: 3,
              }}
            />
          </div>
        </div>
        <MatrixPlot activities={visible} focusedId={current?.id} mini />
        {pending.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p className="wa-eyebrow" style={{ color: 'var(--rust)' }}>
              ↳ Needs classification ({pending.length})
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted-2)', margin: '4px 0 8px' }}>
              {skippedCount > 0 ? `${skippedCount} skipped · deferred to end` : 'not yet placed'}
            </p>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {pending.map((a, i) => {
                const isSkipped = skippedIds.includes(a.id);
                const isActive = i === idx;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`wa-chip ${isActive ? 'is-rust' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: isSkipped && !isActive ? 0.5 : 1,
                      background: isActive ? 'var(--ink)' : undefined,
                      color: isActive ? 'var(--cream)' : undefined,
                    }}
                    onClick={() => setIdx(i)}
                  >
                    <Avatar initials={a.participantInitials} color={a.participantColor} size="sm" />
                    <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="wa-sidebar" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {current ? (
            <>
              <p className="wa-eyebrow" style={{ color: 'var(--rust)' }}>
                ↳ Now reviewing · {currentReviewIndex} / {visible.length}
              </p>
              <div className="wa-activity-title" style={{ fontSize: 18, marginTop: 8 }}>
                {current.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Avatar initials={current.participantInitials} color={current.participantColor} size="sm" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{current.participantName}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <EffortPill activity={current} />
                <ActivityChipsShort activity={current} />
              </div>
              <div style={{ marginTop: 12 }}>
                <FacActions
                  visible
                  onEdit={() => onEdit(current)}
                  onMerge={() => onMerge(current)}
                  onRemove={() => onDelete(current)}
                />
              </div>
              <p className="wa-eyebrow" style={{ marginTop: 16 }}>
                ↳ Team verdict · automatable?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
                {(['yes', 'maybe', 'no'] as const).map((v) => (
                  <ClassifyBtn
                    key={v}
                    label={v === 'yes' ? 'Yes' : v === 'maybe' ? 'Maybe' : 'No'}
                    sub={
                      v === 'yes' ? 'clearly' : v === 'maybe' ? 'partial' : 'human judgement'
                    }
                    tone={v === 'yes' ? 'rust' : v === 'maybe' ? 'amber' : 'neutral'}
                    active={current.teamAuto === v}
                    onClick={() => classify(v)}
                  />
                ))}
              </div>
              <p className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 6 }}>
                ↳ shortcut · 1 / 2 / 3
              </p>
              <p className="wa-eyebrow" style={{ marginTop: 16 }}>
                ↳ Flag this for next quarter?
              </p>
              <button
                type="button"
                className={current.flagged ? 'wa-btn is-ghost' : 'wa-btn is-rust'}
                style={{ width: '100%', marginTop: 8 }}
                onClick={toggleFlag}
              >
                {current.flagged ? '✕ Unflag' : '★ Flag for next quarter'}
              </button>
              <label className="wa-label" style={{ marginTop: 16, display: 'block' }}>
                Optional discussion note · who&apos;ll own it…
              </label>
              <textarea
                className="wa-input"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={saveNote}
                rows={3}
                style={{ width: '100%', resize: 'vertical', marginTop: 4 }}
              />
              {current.relatedTo && current.relatedTo.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p className="wa-eyebrow">↳ Related activities</p>
                  {current.relatedTo.map((relatedId) => {
                    const related = visible.find((a) => a.id === relatedId);
                    if (!related) return null;
                    return (
                      <div
                        key={relatedId}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}
                      >
                        <Avatar initials={related.participantInitials} color={related.participantColor} size="sm" />
                        <span style={{ fontSize: 12 }}>{related.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {similar.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: 'rgba(245, 227, 200, 0.35)',
                    borderRadius: 4,
                  }}
                >
                  <p className="wa-mono" style={{ fontSize: 10, color: 'var(--amber)', marginBottom: 8 }}>
                    ↳ {similar.length} TEAMMATE(S) REPORTED SOMETHING SIMILAR
                  </p>
                  {similar.map(({ activity }) => (
                    <div
                      key={activity.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}
                    >
                      <Avatar initials={activity.participantInitials} color={activity.participantColor} size="sm" />
                      <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activity.title}
                      </span>
                      <button
                        type="button"
                        className="wa-btn is-ghost"
                        style={{ fontSize: 10, padding: '2px 6px' }}
                        onClick={() => onMerge(current)}
                      >
                        ⇄ merge
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : pending.length === 0 && classified.length > 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 28 }}>✓</div>
              <p style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>All activities classified!</p>
              <p style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 4 }}>
                Export the results when you&apos;re done discussing.
              </p>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>Select an activity from the tray to begin.</p>
          )}
          <div style={{ marginTop: 24 }}>
            <p className="wa-eyebrow">
              ★ Flagged so far <span className="wa-mono">{flagged.length}</span>
            </p>
            {flagged.length === 0 ? (
              <p style={{ color: 'var(--muted-2)', fontSize: 13, fontStyle: 'italic', marginTop: 8 }}>
                No activities flagged yet.
              </p>
            ) : (
              flagged.map((a, i) => (
                <div key={a.id} className="wa-activity wa-flagged" style={{ marginTop: 8 }}>
                  <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>
                    {i + 1}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Avatar initials={a.participantInitials} color={a.participantColor} size="sm" />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {a.participantName.split(/\s+/)[0]}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{a.title}</div>
                </div>
              ))
            )}
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border-soft)', padding: 16 }}>
          <p className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', marginBottom: 8 }}>
            ← j &nbsp; k → &nbsp; 1/2/3 classify &nbsp; f flag &nbsp; s skip
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="wa-btn is-ghost"
              style={{ flex: 1 }}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={pending.length === 0}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="wa-btn is-ghost"
              style={{ flex: 1, color: 'var(--muted-2)' }}
              onClick={skip}
              disabled={pending.length === 0}
            >
              Skip ↷
            </button>
            <button
              type="button"
              className="wa-btn"
              style={{ flex: 2, background: 'var(--ink)', color: 'var(--cream)' }}
              onClick={() => setIdx((i) => Math.min(Math.max(0, pending.length - 1), i + 1))}
              disabled={pending.length === 0}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
