'use client';

import React from 'react';

// ── Enum types ──────────────────────────────────────────────────────────────

export type TimePerOccurrence = '<30m' | '30m-2h' | 'half-day' | 'day+';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
export type Energy = 'energizing' | 'fine' | 'tedious' | 'draining';
export type AutoVerdict = 'yes' | 'maybe' | 'no' | 'unclassified';
export type SessionStatus = 'lobby' | 'active' | 'discussion' | 'done';
export type Role = 'IC' | 'EM' | 'PM' | 'UX' | 'Other';

// ── Domain types (client-side mirrors of store types) ───────────────────────

export type Participant = {
  id: string;
  name: string;
  role: Role;
  joinedAt: string;
  color: string;
  initials: string;
};

export type Activity = {
  id: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  participantInitials: string;
  participantColor: string;
  title: string;
  tpo: TimePerOccurrence;
  freq: Frequency;
  energy: Energy;
  teamAuto: AutoVerdict;
  flagged: boolean;
  discussionNote: string;
  createdAt: string;
  editedBy?: string;
  editHistory: string[];
  mergedFromIds?: string[];
  mergedFromNames?: string[];
  mergedFromInitials?: string[];
  mergedFromColors?: string[];
  reportedBy?: string[];
  reportedByInitials?: string[];
  reportedByColors?: string[];
  mergedIntoId?: string;
  isMergedSource?: boolean;
  relatedTo?: string[];
};

export type Session = {
  id: string;
  name: string;
  facilitatorId: string;
  facilitatorName: string;
  status: SessionStatus;
  submissionWindowMin: number;
  liveTeamFeed: boolean;
  recallPrompts: string[];
  enabledCategories: string[];
  createdAt: string;
  startedAt?: string;
  closedAt?: string;
  participants: Participant[];
  activities: Activity[];
};

// ── Label maps ──────────────────────────────────────────────────────────────

export const TPO_LABELS: Record<TimePerOccurrence, string> = {
  '<30m': '<30m',
  '30m-2h': '30m–2h',
  'half-day': 'Half day',
  'day+': 'Day+',
};

export const TPO_LABEL: Record<TimePerOccurrence, string> = {
  '<30m': 'Under 30 min',
  '30m-2h': '30 min – 2 hrs',
  'half-day': 'Half day',
  'day+': 'A full day or more',
};

export const TPO_SHORT: Record<TimePerOccurrence, string> = {
  '<30m': '<30 min',
  '30m-2h': '30m–2h',
  'half-day': '½ day',
  'day+': '1+ day',
};

export const TPO_SUB: Record<TimePerOccurrence, string> = {
  '<30m': 'minutes',
  '30m-2h': 'a couple hours',
  'half-day': 'a chunk',
  'day+': 'all in',
};

export const FREQ_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  adhoc: 'Ad hoc',
};

export const FREQ_LABEL: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  adhoc: 'Ad hoc',
};

export const FREQ_SHORT: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Wkly',
  monthly: 'Mthly',
  quarterly: 'Qtrly',
  adhoc: 'Ad hoc',
};

export const FREQ_SUB: Record<Frequency, string> = {
  daily: 'every day',
  weekly: 'each week',
  monthly: 'each month',
  quarterly: 'each quarter',
  adhoc: 'unpredictable',
};

export const ENERGY_LABELS: Record<Energy, string> = {
  energizing: 'Energizing',
  fine: 'Fine',
  tedious: 'Tedious',
  draining: 'Draining',
};

export const ENERGY_LABEL: Record<Energy, string> = {
  energizing: 'Energizes me',
  fine: "It's fine",
  tedious: 'Tedious',
  draining: 'Drains me',
};

export const ENERGY_SHORT: Record<Energy, string> = {
  energizing: 'Energizes',
  fine: 'Fine',
  tedious: 'Tedious',
  draining: 'Drains',
};

export const ENERGY_SUB: Record<Energy, string> = {
  energizing: 'I like doing it',
  fine: 'No complaints',
  tedious: 'Rather skip it',
  draining: 'I dread it',
};

export const VERDICT_LABELS: Record<AutoVerdict, string> = {
  yes: 'Automate',
  maybe: 'Maybe',
  no: 'Keep human',
  unclassified: 'Unclassified',
};

export const AUTO_LABEL: Record<AutoVerdict, string> = {
  yes: 'Automatable',
  maybe: 'Maybe',
  no: 'Manual forever',
  unclassified: 'Needs review',
};

export const AUTO_SHORT: Record<AutoVerdict, string> = {
  yes: 'Auto',
  maybe: 'Maybe',
  no: 'Manual',
  unclassified: 'Unclassified',
};

// ── Tone maps ───────────────────────────────────────────────────────────────

export const TPO_TONE: Record<TimePerOccurrence, string> = {
  '<30m': 'is-sage',
  '30m-2h': '',
  'half-day': 'is-amber',
  'day+': 'is-rust',
};

export const FREQ_TONE: Record<Frequency, string> = {
  daily: 'is-rust',
  weekly: 'is-amber',
  monthly: '',
  quarterly: '',
  adhoc: 'is-sage',
};

export const ENERGY_TONE: Record<Energy, string> = {
  energizing: 'is-sage',
  fine: '',
  tedious: 'is-amber',
  draining: 'is-rust',
};

export const AUTO_TONE: Record<AutoVerdict, string> = {
  yes: 'is-rust',
  maybe: 'is-amber',
  no: 'is-slate',
  unclassified: 'is-ghost',
};

// ── Calculation helpers ─────────────────────────────────────────────────────

const TPO_HOURS: Record<TimePerOccurrence, number> = {
  '<30m': 0.5,
  '30m-2h': 1.25,
  'half-day': 4,
  'day+': 8,
};

const FREQ_PER_WK: Record<Frequency, number> = {
  daily: 5,
  weekly: 1,
  monthly: 0.23,
  quarterly: 0.077,
  adhoc: 0.3,
};

const ENERGY_MULTIPLIER: Record<Energy, number> = {
  energizing: 0.5,
  fine: 1.0,
  tedious: 1.5,
  draining: 2.0,
};

export function calcEffort(a: Pick<Activity, 'tpo' | 'freq'>): number {
  return TPO_HOURS[a.tpo] * FREQ_PER_WK[a.freq];
}

export function calcPerceivedCost(a: Pick<Activity, 'tpo' | 'freq' | 'energy'>): number {
  return calcEffort(a) * ENERGY_MULTIPLIER[a.energy];
}

export function effortDisplay(hrs: number): string {
  if (hrs < 1) return '<1 h/wk';
  if (hrs < 1.5) return '~1 h/wk';
  if (hrs < 3) return `~${hrs.toFixed(1)} h/wk`;
  if (hrs < 8) return `~${Math.round(hrs)} h/wk`;
  return '8+ h/wk';
}

export function effortPillClass(hrs: number): string {
  const tier = hrs < 1.5 ? 'low' : hrs < 4 ? 'mid' : 'high';
  return `wa-effort-pill wa-effort-pill--${tier}`;
}

export function matrixCoords(a: Pick<Activity, 'tpo' | 'freq' | 'energy'>): { x: number; y: number } {
  const hrs = calcEffort(a);
  const x = Math.min(92, Math.sqrt(hrs / 12) * 100);
  const energyY: Record<Energy, number> = { draining: 12, tedious: 37, fine: 63, energizing: 88 };
  return { x, y: energyY[a.energy] };
}

export function clusterMatrixPositions(
  activities: Activity[],
): Map<string, { x: number; y: number }> {
  const groups = new Map<string, Activity[]>();
  for (const a of activities) {
    const { x, y } = matrixCoords(a);
    const key = `${x.toFixed(1)},${y.toFixed(1)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  const result = new Map<string, { x: number; y: number }>();

  groups.forEach(group => {
    const { x: cx, y: cy } = matrixCoords(group[0]);

    if (group.length === 1) {
      result.set(group[0].id, { x: cx, y: cy });
      return;
    }

    const radius = Math.min(3.5 + group.length * 0.4, 6);

    group.forEach((a, i) => {
      const angle =
        group.length === 2
          ? i === 0
            ? -Math.PI / 2
            : Math.PI / 2
          : (2 * Math.PI * i) / group.length - Math.PI / 2;

      result.set(a.id, {
        x: Math.max(1, Math.min(99, cx + radius * Math.cos(angle))),
        y: Math.max(1, Math.min(99, cy + radius * Math.sin(angle))),
      });
    });
  });

  return result;
}

export function titleSimilarity(a: Activity, b: Activity): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const ta = tokenize(a.title);
  const tb = tokenize(b.title);
  const intersection = new Set([...ta].filter(w => tb.has(w)));
  const union = new Set([...ta, ...tb]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// ── Avatar ─────────────────────────────────────────────────────────────────

export function Avatar({
  initials,
  color,
  size = 28,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      className="wa-avatar"
      style={{
        width: size,
        height: size,
        background: color,
        color: '#fff',
        fontSize: size <= 20 ? 9 : size >= 32 ? 12 : 10,
      }}
    >
      {initials}
    </div>
  );
}

// ── EffortPill ─────────────────────────────────────────────────────────────

export function EffortPill({ activity }: { activity: Pick<Activity, 'tpo' | 'freq'> }) {
  const hrs = calcEffort(activity);
  const cls = effortPillClass(hrs);
  const display = effortDisplay(hrs);
  return (
    <span
      className={cls}
      title={`${TPO_LABEL[activity.tpo]} × ${FREQ_LABEL[activity.freq]}`}
    >
      ◷ {display}
    </span>
  );
}

// ── ActivityChipsShort ─────────────────────────────────────────────────────

export function ActivityChipsShort({ activity }: { activity: Pick<Activity, 'tpo' | 'freq' | 'energy' | 'teamAuto'> & { teamAuto?: AutoVerdict } }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      <span className={`wa-chip wa-chip--tpo ${TPO_TONE[activity.tpo]}`}>{TPO_SHORT[activity.tpo]}</span>
      <span className={`wa-chip wa-chip--freq ${FREQ_TONE[activity.freq]}`}>{FREQ_SHORT[activity.freq]}</span>
      <span className={`wa-chip wa-chip--energy ${ENERGY_TONE[activity.energy]}`}>{ENERGY_SHORT[activity.energy]}</span>
      <EffortPill activity={activity} />
    </div>
  );
}

// ── VerdictChip ────────────────────────────────────────────────────────────

export function VerdictChip({ verdict }: { verdict: AutoVerdict }) {
  return (
    <span className={`wa-verdict wa-verdict--${verdict}`}>
      {VERDICT_LABELS[verdict]}
    </span>
  );
}

// ── QStrip ─────────────────────────────────────────────────────────────────

export function QStrip<T extends string>({
  options,
  value,
  onChange,
  labelMap,
}: {
  options: T[];
  value: T;
  onChange?: (v: T) => void;
  labelMap: Record<T, string>;
}) {
  return (
    <div className="wa-qstrip">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          className={`wa-qstrip-option${opt === value ? ' wa-qstrip-option--selected' : ''}`}
          onClick={() => onChange?.(opt)}
        >
          {labelMap[opt]}
        </button>
      ))}
    </div>
  );
}

// ── QuestionBlock ──────────────────────────────────────────────────────────

export function QuestionBlock<T extends string>({
  label,
  options,
  value,
  onChange,
  labelMap,
}: {
  label: string;
  options: T[];
  value: T;
  onChange?: (v: T) => void;
  labelMap: Record<T, string>;
}) {
  return (
    <div className="wa-question-block">
      <div className="wa-question-label">{label}</div>
      <QStrip options={options} value={value} onChange={onChange} labelMap={labelMap} />
    </div>
  );
}

// ── ClassifyBtn ─────────────────────────────────────────────────────────────

export function ClassifyBtn({
  current,
  onClassify,
}: {
  current: AutoVerdict;
  onClassify: (v: AutoVerdict) => void;
}) {
  const verdicts: Array<{ v: AutoVerdict; label: string; sub: string; tone: string }> = [
    { v: 'yes', label: 'Automate', sub: 'automatable', tone: 'rust' },
    { v: 'maybe', label: 'Maybe', sub: 'investigate', tone: 'amber' },
    { v: 'no', label: 'Keep human', sub: 'manual', tone: 'neutral' },
  ];

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {verdicts.map(({ v, label, sub, tone }) => {
        const active = current === v;

        const bg =
          tone === 'rust'
            ? active
              ? 'var(--rust)'
              : 'var(--rust-bg)'
            : tone === 'amber'
            ? active
              ? 'var(--amber)'
              : 'var(--amber-bg)'
            : active
            ? 'var(--ink)'
            : '#fff';

        const fg =
          tone === 'rust'
            ? active
              ? '#fff'
              : '#6a2810'
            : tone === 'amber'
            ? active
              ? '#fff'
              : '#6f4318'
            : active
            ? 'var(--cream)'
            : 'var(--ink)';

        const bd =
          tone === 'rust' ? '#e8c8b8' : tone === 'amber' ? '#e8d2a8' : 'var(--rule)';

        return (
          <button
            key={v}
            type="button"
            onClick={() => onClassify(current === v ? 'unclassified' : v)}
            style={{
              background: bg,
              color: fg,
              border: `1px solid ${active ? 'transparent' : bd}`,
              borderRadius: 4,
              padding: '10px 8px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              fontFamily: 'var(--font-body)',
              flex: 1,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 10, opacity: 0.75, fontFamily: 'var(--font-mono)' }}>{sub}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── TimerDisplay ────────────────────────────────────────────────────────────

export function TimerDisplay({ remainingSeconds }: { remainingSeconds: number }) {
  if (remainingSeconds <= 0) {
    return <span className="wa-timer">Time up</span>;
  }
  const urgent = remainingSeconds <= 120;
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  const formatted = `${m}:${s.toString().padStart(2, '0')}`;
  return (
    <span className={`wa-timer${urgent ? ' wa-timer--urgent' : ''}`}>{formatted}</span>
  );
}

// ── StatusBadge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: SessionStatus }) {
  const labels: Record<SessionStatus, string> = {
    lobby: 'Lobby',
    active: 'Active',
    discussion: 'Discussion',
    done: 'Done',
  };
  return (
    <span className={`wa-status-badge wa-status-badge--${status}`}>
      {labels[status]}
    </span>
  );
}

// ── Toggle ──────────────────────────────────────────────────────────────────

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange?: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12.5,
        color: 'var(--ink-2)',
        cursor: 'pointer',
      }}
    >
      <button
        type="button"
        className={`wa-toggle${on ? ' wa-toggle--on' : ''}`}
        onClick={() => onChange?.(!on)}
        aria-pressed={on}
      />
      {label}
    </label>
  );
}

// ── Chip (utility) ─────────────────────────────────────────────────────────

export function Chip({
  children,
  tone = '',
  style,
}: {
  children: React.ReactNode;
  tone?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`wa-chip ${tone}`} style={style}>
      {children}
    </span>
  );
}

// ── Topbar ─────────────────────────────────────────────────────────────────

export function Topbar({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="wa-topbar">
      <a href="/" className="wa-brand">
        <span className="wa-brandmark">W</span>
        <span>Work Audit</span>
      </a>
      <div style={{ height: 20, width: 1, background: 'var(--rule)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        {sub ? (
          <div className="wa-eyebrow" style={{ fontSize: 10 }}>
            {sub}
          </div>
        ) : null}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {right}
      </div>
    </div>
  );
}

// ── Eyebrow ────────────────────────────────────────────────────────────────

export function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="wa-eyebrow" style={color ? { color } : {}}>
      {children}
    </span>
  );
}

// ── FacActions ─────────────────────────────────────────────────────────────

export function FacActions({
  size = 'md',
  onEdit,
  onMerge,
  onRemove,
}: {
  size?: 'sm' | 'md';
  onEdit?: () => void;
  onMerge?: () => void;
  onRemove?: () => void;
}) {
  const px =
    size === 'sm' ? { fontSize: 10, padding: '2px 6px' } : { fontSize: 11, padding: '3px 7px' };
  const btnStyle: React.CSSProperties = {
    ...px,
    background: 'transparent',
    border: '1px solid var(--border-soft)',
    borderRadius: 3,
    cursor: 'pointer',
    color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.02em',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button style={btnStyle} onClick={onEdit} title="Edit activity">
        ✎ edit
      </button>
      <button style={btnStyle} onClick={onMerge} title="Merge into…">
        ⇄ merge
      </button>
      <button style={btnStyle} onClick={onRemove} title="Remove">
        ×
      </button>
    </span>
  );
}
