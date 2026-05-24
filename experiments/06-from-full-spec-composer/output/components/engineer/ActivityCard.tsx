'use client';

import { useEffect, useState } from 'react';
import type { Activity } from '@/lib/domain/types';
import type { Energy, Freq, TeamAuto, Tpo } from '@/lib/domain/enums';
import { emitActivityUpdate } from '@/lib/socket';
import { firstNameFromDisplayName } from '@/lib/domain/suggestions';
import { EffortPill } from '@/components/EffortPill';
import { QStrip } from '@/components/QStrip';
import { Avatar } from '@/components/ui';
import {
  ENERGY_LABELS,
  FREQ_LABELS,
  TEAM_AUTO_LABELS,
  TPO_LABELS,
} from '@/lib/domain/enums';

const VERDICT_LABELS: Record<TeamAuto, string> = {
  yes: 'Automatable',
  maybe: 'Maybe',
  no: 'Manual',
  unclassified: 'Pending…',
};

const VERDICT_TONE: Record<TeamAuto, string> = {
  yes: 'is-rust',
  maybe: 'is-amber',
  no: '',
  unclassified: 'is-ghost',
};

function QStripRow<T extends string>({
  label,
  options,
  value,
  labels,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  labels: Record<T, string>;
  onChange?: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        className="wa-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.08em',
          color: 'var(--muted-2)',
          minWidth: 92,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <QStrip options={options} value={value} labels={labels} onChange={onChange} />
    </div>
  );
}

export function ActivityCard({
  activity,
  index,
  editable,
  sessionId,
  onSoftDelete,
}: {
  activity: Activity;
  index?: number;
  editable: boolean;
  sessionId: string;
  onSoftDelete?: (id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(activity.title);

  useEffect(() => {
    setTitle(activity.title);
  }, [activity.title]);

  const save = () => {
    emitActivityUpdate({
      sessionId,
      activityId: activity.id,
      title,
      tpo: activity.tpo,
      freq: activity.freq,
      energy: activity.energy,
    });
    setEditing(false);
  };

  const cancel = () => {
    setTitle(activity.title);
    setEditing(false);
  };

  const updateDim = (field: 'tpo' | 'freq' | 'energy', value: string) => {
    emitActivityUpdate({
      sessionId,
      activityId: activity.id,
      [field]: value,
    });
  };

  const qStripRows = (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <QStripRow
        label="TIME / OCC"
        options={['<30m', '30m-2h', 'half-day', 'day+'] as Tpo[]}
        value={activity.tpo}
        labels={Object.fromEntries(
          (['<30m', '30m-2h', 'half-day', 'day+'] as Tpo[]).map((k) => [k, TPO_LABELS[k].short]),
        ) as Record<Tpo, string>}
        onChange={editable ? (v) => updateDim('tpo', v) : undefined}
      />
      <QStripRow
        label="CADENCE"
        options={['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'] as Freq[]}
        value={activity.freq}
        labels={Object.fromEntries(
          (['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'] as Freq[]).map((k) => [
            k,
            FREQ_LABELS[k].short,
          ]),
        ) as Record<Freq, string>}
        onChange={editable ? (v) => updateDim('freq', v) : undefined}
      />
      <QStripRow
        label="ENERGY"
        options={['energizing', 'fine', 'tedious', 'draining'] as Energy[]}
        value={activity.energy}
        labels={Object.fromEntries(
          (['energizing', 'fine', 'tedious', 'draining'] as Energy[]).map((k) => [
            k,
            ENERGY_LABELS[k].short,
          ]),
        ) as Record<Energy, string>}
        onChange={editable ? (v) => updateDim('energy', v) : undefined}
      />
    </div>
  );

  return (
    <div className={`wa-activity ${activity.flagged ? 'wa-flagged' : ''}`} style={{ marginBottom: 12 }}>
      {editable && (
        <button
          type="button"
          className="wa-delete-btn"
          onClick={() => onSoftDelete?.(activity.id, activity.title)}
          aria-label="Delete activity"
        >
          ×
        </button>
      )}
      <div className="wa-activity-header">
        <div className="wa-activity-header-main">
          {index !== undefined && (
            <span className="wa-num">{String(index).padStart(2, '0')}</span>
          )}
          {editing ? (
            <input
              className="wa-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') cancel();
              }}
              autoFocus
            />
          ) : (
            <span
              className="wa-activity-title"
              onClick={() => editable && setEditing(true)}
              style={editable ? { cursor: 'pointer' } : undefined}
            >
              {activity.title}
            </span>
          )}
          {editable && !editing && (
            <button
              type="button"
              className="wa-pencil-trigger"
              onClick={() => setEditing(true)}
              aria-label="Rename activity"
            >
              ✎
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <EffortPill activity={activity} size="sm" />
          {!editable && (
            <span
              className={`wa-chip ${VERDICT_TONE[activity.teamAuto]}`}
              style={activity.teamAuto === 'unclassified' ? { opacity: 0.5 } : undefined}
              title={TEAM_AUTO_LABELS[activity.teamAuto].long}
            >
              {VERDICT_LABELS[activity.teamAuto]}
            </span>
          )}
          {activity.flagged && (
            <span style={{ color: 'var(--flag)', fontSize: 14 }} aria-label="Flagged priority">
              ★
            </span>
          )}
        </div>
      </div>
      {qStripRows}
      {activity.editedBy && (
        <p className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 8 }}>
          edited by {activity.editedBy}
        </p>
      )}
      {!editable && activity.discussionNote && (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, lineHeight: 1.4 }}>
          {activity.discussionNote}
        </p>
      )}
    </div>
  );
}

export function FlaggedPriorityCard({
  activity,
  index,
}: {
  activity: Activity;
  index: number;
}) {
  return (
    <div
      className="wa-activity wa-flagged"
      style={{
        padding: 10,
        marginBottom: 8,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      <span className="wa-num" style={{ marginTop: 2 }}>
        {String(index).padStart(2, '0')}
      </span>
      <Avatar initials={activity.participantInitials} color={activity.participantColor} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
          {firstNameFromDisplayName(activity.participantName)}
        </div>
        <div className="wa-activity-title" style={{ fontWeight: 700 }}>
          {activity.title}
        </div>
      </div>
      <span style={{ color: 'var(--flag)', fontSize: 14, flexShrink: 0 }} aria-hidden>
        ★
      </span>
    </div>
  );
}
