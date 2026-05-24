'use client';

import { useMemo, useState } from 'react';
import type { Activity, SerializedSession } from '@/lib/domain/types';
import type { Freq } from '@/lib/domain/enums';
import { ROLE_LABELS } from '@/lib/domain/enums';
import { ActivityChipsShort } from '@/components/ActivityChipsShort';
import { EffortPill } from '@/components/EffortPill';
import { Avatar, FacActions } from '@/components/ui';

const FREQ_ROWS: { key: Freq; label: string; color: string }[] = [
  { key: 'daily', label: 'Daily', color: 'var(--rust)' },
  { key: 'weekly', label: 'Weekly', color: 'var(--amber)' },
  { key: 'monthly', label: 'Monthly', color: 'var(--slate)' },
  { key: 'quarterly', label: 'Quarterly', color: 'var(--slate)' },
];

function PersonCounts({ session }: { session: SerializedSession }) {
  const engineers = session.participants.filter((p) => !p.isFacilitator);
  const visible = session.activities.filter((a) => !a.isMergedSource);
  const total = visible.length;
  const avg = engineers.length > 0 ? (total / engineers.length).toFixed(1) : '—';

  return (
    <div>
      <p className="wa-eyebrow" style={{ marginBottom: 14 }}>
        ↳ Submissions per person
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {engineers.map((p) => {
          const count = visible.filter((a) => a.participantId === p.id).length;
          const status = count >= 3 ? 'ok' : count >= 1 ? 'low' : 'idle';
          const tone =
            status === 'ok' ? 'var(--sage)' : status === 'low' ? 'var(--amber)' : 'var(--muted-2)';

          return (
            <div
              key={p.id}
              className="wa-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
              }}
            >
              <Avatar initials={p.initials} color={p.color} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.name}
                </div>
                <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {ROLE_LABELS[p.role] ?? p.role}
                </div>
                <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>
                  {count === 0 ? 'not started' : `${count} activities`}
                </div>
              </div>
              <span className="wa-mono" style={{ fontSize: 16, fontWeight: 600, color: tone }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
      <hr className="wa-rule" style={{ margin: '18px 0 14px' }} />
      <p className="wa-eyebrow" style={{ marginBottom: 8 }}>
        ↳ Totals
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ color: 'var(--muted)' }}>Activities so far</span>
        <span className="wa-mono" style={{ fontWeight: 600 }}>
          {total}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
        <span style={{ color: 'var(--muted)' }}>Per-engineer avg</span>
        <span className="wa-mono" style={{ fontWeight: 600 }}>
          {avg}
        </span>
      </div>
    </div>
  );
}

function LiveCard({
  activity,
  sources,
  onEdit,
  onMerge,
  onDelete,
}: {
  activity: Activity;
  sources: Activity[];
  onEdit: (a: Activity) => void;
  onMerge: (a: Activity) => void;
  onDelete: (a: Activity) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="wa-activity">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Avatar initials={activity.participantInitials} color={activity.participantColor} size="sm" />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{activity.participantName}</span>
          <span style={{ marginLeft: 'auto' }}>
            <FacActions
              onEdit={() => onEdit(activity)}
              onMerge={() => onMerge(activity)}
              onRemove={() => onDelete(activity)}
            />
          </span>
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ flex: 1 }}>{activity.title}</span>
          <EffortPill activity={activity} />
        </div>
        <ActivityChipsShort activity={activity} />
        {sources.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              marginTop: 8,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 9 }}>{open ? '▾' : '▸'}</span>
            {open ? 'hide' : `${sources.length} original${sources.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
      {open && (
        <div style={{ marginLeft: 20, marginTop: 3, display: 'grid', gap: 3 }}>
          {sources.map((s) => (
            <div
              key={s.id}
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--border-soft)',
                borderRadius: 4,
                padding: '7px 10px',
                opacity: 0.7,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Avatar initials={s.participantInitials} color={s.participantColor} size="sm" />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{s.participantName}</span>
                <span className="wa-mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted-2)' }}>
                  original
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{s.title}</div>
              <div style={{ marginTop: 4 }}>
                <ActivityChipsShort activity={s} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveView({
  session,
  onEdit,
  onMerge,
  onDelete,
}: {
  session: SerializedSession;
  onEdit: (a: Activity) => void;
  onMerge: (a: Activity) => void;
  onDelete: (a: Activity) => void;
}) {
  const visible = session.activities.filter((a) => !a.isMergedSource);
  const activities = [...visible]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const themes = useMemo(() => {
    const wordMap = new Map<string, Set<string>>();
    for (const a of visible) {
      const words = a.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      for (const w of words) {
        if (!wordMap.has(w)) wordMap.set(w, new Set());
        wordMap.get(w)!.add(a.participantName.split(' ')[0]);
      }
    }
    return Array.from(wordMap.entries())
      .filter(([, names]) => names.size >= 2)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 5);
  }, [visible]);

  const freqCounts = useMemo(() => {
    const counts: Record<Freq, number> = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      quarterly: 0,
      adhoc: 0,
    };
    for (const a of visible) counts[a.freq] += 1;
    return counts;
  }, [visible]);

  const maxFreq = Math.max(
    freqCounts.daily,
    freqCounts.weekly,
    freqCounts.monthly,
    freqCounts.quarterly,
    1,
  );

  return (
    <div className="wa-layout-3col-facilitator">
      <div className="wa-rail">
        <PersonCounts session={session} />
      </div>
      <div className="wa-col-scroll" style={{ padding: '24px 28px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h2 className="wa-display" style={{ fontSize: 22, margin: 0 }}>
            Live stream
          </h2>
          <span className="wa-tick">↳ newest first</span>
        </div>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>◌</div>
            Waiting for engineers to submit activities…
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {activities.map((a) => {
              const sources = a.mergedFromIds
                ? session.activities.filter((x) => a.mergedFromIds!.includes(x.id))
                : [];
              return (
                <LiveCard
                  key={a.id}
                  activity={a}
                  sources={sources}
                  onEdit={onEdit}
                  onMerge={onMerge}
                  onDelete={onDelete}
                />
              );
            })}
          </div>
        )}
      </div>
      <div className="wa-sidebar" style={{ minWidth: 220, padding: '24px 24px' }}>
        <p className="wa-eyebrow">↳ Emerging themes</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 18px', lineHeight: 1.5 }}>
          Patterns by topic — automatability gets decided together in discussion.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 22 }}>
          {themes.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted-2)', fontStyle: 'italic' }}>
              Themes will emerge as submissions grow.
            </div>
          ) : (
            themes.map(([word, names], i) => (
              <div
                key={word}
                className="wa-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 11px',
                }}
              >
                <span
                  className="wa-mono"
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: i < 2 ? 'var(--rust)' : 'var(--muted)',
                  }}
                >
                  {names.size}×
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, textTransform: 'capitalize' }}>
                    {word}
                  </div>
                  <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>
                    {Array.from(names).join(' · ')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <hr className="wa-rule" style={{ margin: '14px 0' }} />
        <p className="wa-eyebrow">↳ Frequency distribution</p>
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {FREQ_ROWS.map(({ key, label, color }) => {
            const count = freqCounts[key];
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 70, fontSize: 12 }}>{label}</span>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: 'var(--paper-deep)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(count / maxFreq) * 100}%`,
                      height: '100%',
                      background: color,
                    }}
                  />
                </div>
                <span className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)', width: 16, textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
