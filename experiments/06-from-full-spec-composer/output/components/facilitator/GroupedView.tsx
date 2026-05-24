'use client';

import { useState } from 'react';
import type { Activity, SerializedSession } from '@/lib/domain/types';
import type { Energy, TeamAuto } from '@/lib/domain/enums';
import { ENERGY_LABELS } from '@/lib/domain/enums';
import { perceivedCostForActivity } from '@/lib/domain/calculations';
import { ActivityChipsShort } from '@/components/ActivityChipsShort';
import { EffortPill } from '@/components/EffortPill';
import { Avatar, FacActions } from '@/components/ui';

const ENERGY_ORDER: Energy[] = ['draining', 'tedious', 'fine', 'energizing'];

const COLUMN_META: Record<
  'yes' | 'maybe' | 'no',
  { title: string; hint: string; bg: string; countColor: string; dimmed?: boolean }
> = {
  yes: {
    title: 'Automatable',
    hint: 'Team agreed: yes · → Build the automation',
    bg: 'var(--rust-bg)',
    countColor: 'var(--rust)',
  },
  maybe: {
    title: 'Maybe',
    hint: 'Team agreed: maybe · → Research spike needed',
    bg: 'var(--amber-bg)',
    countColor: 'var(--amber)',
  },
  no: {
    title: 'Manual · no action needed',
    hint: 'Team agreed: no · acknowledged, no action this quarter',
    bg: 'var(--paper)',
    countColor: 'var(--muted-2)',
    dimmed: true,
  },
};

function GroupedCard({
  activity,
  rank,
  onEdit,
  onMerge,
  onDelete,
}: {
  activity: Activity;
  rank?: number;
  onEdit: (a: Activity) => void;
  onMerge: (a: Activity) => void;
  onDelete: (a: Activity) => void;
}) {
  const firstName = activity.participantName.split(' ')[0];

  return (
    <div className={`wa-activity${activity.flagged ? ' wa-flagged' : ''}`} style={{ padding: '10px 12px', position: 'relative' }}>
      {rank !== undefined && (
        <span
          className="wa-mono"
          style={{
            position: 'absolute',
            top: 8,
            left: 10,
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--muted-2)',
            letterSpacing: '0.04em',
          }}
        >
          {String(rank).padStart(2, '0')}
        </span>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
          paddingLeft: rank !== undefined ? 18 : 0,
        }}
      >
        <Avatar initials={activity.participantInitials} color={activity.participantColor} size="sm" />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{firstName}</span>
        <EffortPill activity={activity} size="sm" />
        {activity.flagged && (
          <span style={{ color: 'var(--flag)', fontSize: 12, marginLeft: 'auto' }}>★</span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>{activity.title}</div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <ActivityChipsShort activity={activity} />
        <span style={{ marginLeft: 'auto' }}>
          <FacActions
            onEdit={() => onEdit(activity)}
            onMerge={() => onMerge(activity)}
            onRemove={() => onDelete(activity)}
          />
        </span>
      </div>
    </div>
  );
}

export function GroupedView({
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
  const [sort, setSort] = useState<'effort' | 'energy' | 'person'>('effort');
  const [showUnclassified, setShowUnclassified] = useState(true);
  const visible = session.activities.filter((a) => !a.isMergedSource);

  const sortFn = (a: Activity, b: Activity) => {
    if (sort === 'effort') return perceivedCostForActivity(b) - perceivedCostForActivity(a);
    if (sort === 'energy') {
      return ENERGY_ORDER.indexOf(a.energy) - ENERGY_ORDER.indexOf(b.energy);
    }
    return a.participantName.localeCompare(b.participantName);
  };

  const columns = ['yes', 'maybe', 'no'] as const;
  const unclassified = visible.filter((a) => a.teamAuto === 'unclassified');

  return (
    <div
      style={{
        padding: '24px 32px',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <div>
          <p className="wa-eyebrow">Grouped by team verdict on automatability</p>
          <h2 className="wa-display" style={{ fontSize: 22, margin: '4px 0 0' }}>
            Automation backlog · act on these in order.
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="wa-eyebrow" style={{ marginRight: 6 }}>
            Sort ·
          </span>
          <div className="wa-tabs">
            {(['effort', 'energy', 'person'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={sort === s ? 'is-on' : ''}
                onClick={() => setSort(s)}
                style={{ textTransform: 'capitalize' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 18,
          flex: unclassified.length > 0 ? '0 0 auto' : 1,
          overflow: unclassified.length > 0 ? 'visible' : 'hidden',
          maxHeight: unclassified.length > 0 ? '55%' : undefined,
        }}
      >
        {(columns as readonly ('yes' | 'maybe' | 'no')[]).map((key) => {
          const meta = COLUMN_META[key];
          const items = visible.filter((a) => a.teamAuto === key).sort(sortFn);
          const showRank = key !== 'no';

          return (
            <div
              key={key}
              style={{
                background: meta.bg,
                border: '1px solid var(--border-soft)',
                borderRadius: 6,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                opacity: meta.dimmed ? 0.72 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  className="wa-mono"
                  style={{ fontSize: 20, fontWeight: 600, color: meta.countColor }}
                >
                  {items.length}
                </span>
                <h3
                  className="wa-display"
                  style={{
                    fontSize: 18,
                    margin: 0,
                    color: meta.dimmed ? 'var(--muted)' : undefined,
                  }}
                >
                  {meta.title}
                </h3>
              </div>
              <p
                style={{
                  fontSize: 11.5,
                  color: meta.dimmed ? 'var(--muted-2)' : 'var(--ink-2)',
                  marginBottom: 14,
                }}
              >
                {meta.hint}
              </p>
              <div style={{ display: 'grid', gap: 6, overflowY: 'auto', paddingRight: 4 }}>
                {items.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted-2)', fontStyle: 'italic' }}>
                    None yet.
                  </div>
                )}
                {items.map((a, idx) => (
                  <GroupedCard
                    key={a.id}
                    activity={a}
                    rank={showRank ? idx + 1 : undefined}
                    onEdit={onEdit}
                    onMerge={onMerge}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {unclassified.length > 0 && (
        <div
          style={{
            marginTop: 14,
            flexShrink: 0,
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <button
            type="button"
            onClick={() => setShowUnclassified((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--paper-deep)',
              border: '1px dashed var(--rule)',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: showUnclassified ? 8 : 0,
              width: '100%',
            }}
          >
            <span className="wa-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
              {unclassified.length}
            </span>
            <span className="wa-display" style={{ fontSize: 16, color: 'var(--muted)' }}>
              Not yet classified
            </span>
            <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', marginLeft: 8 }}>
              Classify these during discussion
            </span>
            <span className="wa-mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-2)' }}>
              {showUnclassified ? '▲ hide' : '▼ show'}
            </span>
          </button>
          {showUnclassified && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                overflowY: 'auto',
                padding: '4px 2px',
              }}
            >
              {unclassified.sort(sortFn).map((a) => {
                const firstName = a.participantName.split(' ')[0];
                return (
                  <div
                    key={a.id}
                    className="wa-activity"
                    style={{ padding: '9px 11px', width: 'calc(33% - 6px)', minWidth: 220 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <Avatar initials={a.participantInitials} color={a.participantColor} size="sm" />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{firstName}</span>
                      <EffortPill activity={a} size="sm" />
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.3, marginBottom: 5 }}>
                      {a.title}
                    </div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="wa-chip is-amber" style={{ padding: '2px 5px', fontSize: 10 }}>
                        {ENERGY_LABELS[a.energy].short}
                      </span>
                      <span style={{ marginLeft: 'auto' }}>
                        <FacActions
                          onEdit={() => onEdit(a)}
                          onMerge={() => onMerge(a)}
                          onRemove={() => onDelete(a)}
                        />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
