'use client';
// Shared UI primitives — editorial-audit design system
// All components use CSS variables from globals.css

import React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export type TimePerOccurrence = '<30m' | '30m-2h' | 'half-day' | 'day+';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
export type Energy = 'energizing' | 'fine' | 'tedious' | 'draining';
export type AutoVerdict = 'yes' | 'maybe' | 'no' | 'unclassified';

// ── Label maps ─────────────────────────────────────────────────────────────

export const TPO_LABEL: Record<TimePerOccurrence, string> = {
  '<30m': 'Under 30 min', '30m-2h': '30 min – 2 hrs', 'half-day': 'Half day', 'day+': 'A full day or more',
};
export const TPO_SHORT: Record<TimePerOccurrence, string> = {
  '<30m': '<30 min', '30m-2h': '30m–2h', 'half-day': '½ day', 'day+': '1+ day',
};
export const TPO_SUB: Record<TimePerOccurrence, string> = {
  '<30m': 'minutes', '30m-2h': 'a couple hours', 'half-day': 'a chunk', 'day+': 'all in',
};
export const FREQ_LABEL: Record<Frequency, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', adhoc: 'Ad hoc',
};
export const FREQ_SHORT: Record<Frequency, string> = {
  daily: 'Daily', weekly: 'Wkly', monthly: 'Mthly', quarterly: 'Qtrly', adhoc: 'Ad hoc',
};
export const FREQ_SUB: Record<Frequency, string> = {
  daily: 'every day', weekly: 'each week', monthly: 'each month', quarterly: 'each quarter', adhoc: 'unpredictable',
};
export const ENERGY_LABEL: Record<Energy, string> = {
  energizing: 'Energizes me', fine: "It's fine", tedious: 'Tedious', draining: 'Drains me',
};
export const ENERGY_SHORT: Record<Energy, string> = {
  energizing: 'Energizes', fine: 'Fine', tedious: 'Tedious', draining: 'Drains',
};
export const ENERGY_SUB: Record<Energy, string> = {
  energizing: 'I like doing it', fine: 'No complaints', tedious: 'Rather skip it', draining: 'I dread it',
};
export const AUTO_LABEL: Record<AutoVerdict, string> = {
  yes: 'Automatable', maybe: 'Maybe', no: 'Manual forever', unclassified: 'Needs review',
};
export const AUTO_SHORT: Record<AutoVerdict, string> = {
  yes: 'Auto', maybe: 'Maybe', no: 'Manual', unclassified: 'Unclassified',
};

export const TPO_TONE: Record<TimePerOccurrence, string> = {
  '<30m': 'is-sage', '30m-2h': '', 'half-day': 'is-amber', 'day+': 'is-rust',
};
export const FREQ_TONE: Record<Frequency, string> = {
  daily: 'is-rust', weekly: 'is-amber', monthly: '', quarterly: '', adhoc: 'is-sage',
};
export const ENERGY_TONE: Record<Energy, string> = {
  energizing: 'is-sage', fine: '', tedious: 'is-amber', draining: 'is-rust',
};
export const AUTO_TONE: Record<AutoVerdict, string> = {
  yes: 'is-rust', maybe: 'is-amber', no: '', unclassified: 'is-ghost',
};

// ── Effort calc ────────────────────────────────────────────────────────────

const TPO_HOURS: Record<TimePerOccurrence, number> = {
  '<30m': 0.5, '30m-2h': 1.25, 'half-day': 4, 'day+': 8,
};
const FREQ_PER_WK: Record<Frequency, number> = {
  daily: 5, weekly: 1, monthly: 0.23, quarterly: 0.077, adhoc: 0.3,
};

export function calcEffort(tpo: TimePerOccurrence, freq: Frequency) {
  const hrs = TPO_HOURS[tpo] * FREQ_PER_WK[freq];
  const display = hrs < 1 ? '<1 h/wk'
    : hrs < 1.5 ? '~1 h/wk'
    : hrs < 3   ? `~${hrs.toFixed(1)} h/wk`
    : hrs < 8   ? `~${Math.round(hrs)} h/wk`
    : '8+ h/wk';
  return { hrs, display };
}

export function effortTone(hrs: number): string {
  return hrs < 1.5 ? 'is-sage' : hrs < 4 ? 'is-amber' : 'is-rust';
}

// Matrix coords: X = effort (sqrt scale for visual spread), Y = energy (4 levels, fills both halves)
export function matrixCoords(tpo: TimePerOccurrence, freq: Frequency, energy: Energy) {
  const { hrs } = calcEffort(tpo, freq);
  // Sqrt scale spreads low-effort activities rather than bunching them at the left edge
  const x = Math.min(92, Math.sqrt(hrs / 12) * 100);
  // Explicit Y positions — no dead center, always something in top or bottom half
  const energyY: Record<Energy, number> = { draining: 12, tedious: 37, fine: 63, energizing: 88 };
  return { x, y: energyY[energy] };
}

/**
 * Clusters activities that share the same matrix position into a small ring
 * so overlapping dots spread out and remain individually visible.
 *
 * Returns a Map<activityId, {x, y}> with adjusted plot-percent coordinates.
 */
export function clusterMatrixPositions<T extends {
  id: string; tpo: TimePerOccurrence; freq: Frequency; energy: Energy;
}>(activities: T[]): Map<string, { x: number; y: number }> {
  // Group by rounded centroid key (1 decimal place = ~0.1% grid)
  const groups = new Map<string, T[]>();
  for (const a of activities) {
    const { x, y } = matrixCoords(a.tpo, a.freq, a.energy);
    const key = `${x.toFixed(1)},${y.toFixed(1)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  const result = new Map<string, { x: number; y: number }>();

  groups.forEach(group => {
    const { x: cx, y: cy } = matrixCoords(group[0].tpo, group[0].freq, group[0].energy);

    if (group.length === 1) {
      result.set(group[0].id, { x: cx, y: cy });
      return;
    }

    // Radius grows slightly with count but is capped so dots stay in-quadrant
    // 3.5% at n=2, ~4.5% at n=4, capped at 6%
    const radius = Math.min(3.5 + group.length * 0.4, 6);

    group.forEach((a, i) => {
      // Start at top (−π/2) and go clockwise; for 2 items go left/right instead
      const angle = group.length === 2
        ? i === 0 ? -Math.PI / 2 : Math.PI / 2
        : (2 * Math.PI * i) / group.length - Math.PI / 2;

      result.set(a.id, {
        x: Math.max(1, Math.min(99, cx + radius * Math.cos(angle))),
        y: Math.max(1, Math.min(99, cy + radius * Math.sin(angle))),
      });
    });
  });

  return result;
}

// ── Chip ───────────────────────────────────────────────────────────────────

export function Chip({ children, tone = '', style }: {
  children: React.ReactNode; tone?: string; style?: React.CSSProperties;
}) {
  return (
    <span className={`wa-chip ${tone}`} style={style}>{children}</span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────

export function Avatar({ initials, color, size = 'md' }: {
  initials: string; color: string; size?: 'sm' | 'md' | 'lg';
}) {
  const cls = size === 'sm' ? 'wa-avatar is-sm' : size === 'lg' ? 'wa-avatar is-lg' : 'wa-avatar';
  return (
    <span className={cls} style={{ background: color, color: '#fff' }}>{initials}</span>
  );
}

// ── EffortPill ─────────────────────────────────────────────────────────────

export function EffortPill({
  tpo, freq, size = 'md',
}: { tpo: TimePerOccurrence; freq: Frequency; size?: 'sm' | 'md' | 'lg' }) {
  const { hrs, display } = calcEffort(tpo, freq);
  const tone = effortTone(hrs);
  const px = size === 'lg' ? { fontSize: 13, padding: '5px 10px' }
    : size === 'sm' ? { fontSize: 10.5, padding: '2px 6px' }
    : { fontSize: 12, padding: '3px 8px' };
  return (
    <span
      className={`wa-chip ${tone}`}
      title={`${TPO_LABEL[tpo]} × ${FREQ_LABEL[freq]}`}
      style={{ ...px, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
    >
      ◷ {display}
    </span>
  );
}

// ── ActivityChipsShort ─────────────────────────────────────────────────────

export function ActivityChipsShort({
  tpo, freq, energy, teamAuto, showAuto,
}: {
  tpo: TimePerOccurrence; freq: Frequency; energy: Energy;
  teamAuto?: AutoVerdict; showAuto?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      <Chip tone={TPO_TONE[tpo]}>{TPO_SHORT[tpo]}</Chip>
      <Chip tone={FREQ_TONE[freq]}>{FREQ_SHORT[freq]}</Chip>
      <Chip tone={ENERGY_TONE[energy]}>{ENERGY_SHORT[energy]}</Chip>
      {showAuto && teamAuto && teamAuto !== 'unclassified' ? (
        <Chip tone={AUTO_TONE[teamAuto]}>★ {AUTO_SHORT[teamAuto]}</Chip>
      ) : null}
    </div>
  );
}

// ── FacActions — edit / merge / remove inline buttons ────────────────────────

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
  const px = size === 'sm'
    ? { fontSize: 10, padding: '2px 6px' }
    : { fontSize: 11, padding: '3px 7px' };
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
      <button style={btnStyle} onClick={onEdit}  title="Edit activity">✎ edit</button>
      {onMerge && (
        <button style={btnStyle} onClick={onMerge} title="Merge activity">⇄ merge</button>
      )}
      <button style={btnStyle} onClick={onRemove} title="Remove">×</button>
    </span>
  );
}

// ── Topbar ─────────────────────────────────────────────────────────────────

export function Topbar({
  title, sub, right,
}: {
  title: string; sub?: string; right?: React.ReactNode;
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
        {sub ? <div className="wa-eyebrow" style={{ fontSize: 10 }}>{sub}</div> : null}
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
    <span className="wa-eyebrow" style={color ? { color } : {}}>{children}</span>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-2)', cursor: 'pointer' }}>
      <span
        onClick={() => onChange?.(!on)}
        style={{
          width: 30, height: 18, borderRadius: 9,
          background: on ? 'var(--ink)' : 'var(--rule)',
          position: 'relative', flexShrink: 0,
          display: 'inline-block', cursor: 'pointer',
        }}
      >
        <span style={{
          position: 'absolute', width: 12, height: 12, borderRadius: '50%',
          background: '#fff', top: 3, [on ? 'right' : 'left']: 3,
        }} />
      </span>
      {label}
    </label>
  );
}

// ── ClassifyBtn ─────────────────────────────────────────────────────────────

export function ClassifyBtn({
  label, sub, tone, active, onClick,
}: {
  label: string; sub: string; tone?: string; active?: boolean; onClick?: () => void;
}) {
  const bg = tone === 'rust'  ? (active ? 'var(--rust)'  : 'var(--rust-bg)')
           : tone === 'amber' ? (active ? 'var(--amber)' : 'var(--amber-bg)')
           : active ? 'var(--ink)' : '#fff';
  const fg = tone === 'rust'  ? (active ? '#fff' : '#6a2810')
           : tone === 'amber' ? (active ? '#fff' : '#6f4318')
           : active ? 'var(--cream)' : 'var(--ink)';
  const bd = tone === 'rust'  ? '#e8c8b8'
           : tone === 'amber' ? '#e8d2a8'
           : 'var(--rule)';
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, color: fg,
        border: `1px solid ${active ? 'transparent' : bd}`,
        borderRadius: 4, padding: '10px 8px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        fontFamily: 'var(--font-body)', flex: 1,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 10, opacity: 0.75, fontFamily: 'var(--font-mono)' }}>{sub}</span>
    </button>
  );
}

// ── QStrip — compact segmented answer row ─────────────────────────────────

export function QStrip({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: [string, string][];
  onChange?: (v: string) => void;
}) {
  const interactive = !!onChange;
  return (
    <div>
      <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
        {options.map(([v, lbl], i) => {
          const on = v === value;
          const segStyle: React.CSSProperties = {
            flex: 1,
            padding: '6px 4px',
            textAlign: 'center',
            fontSize: 10.5,
            background: on ? 'var(--ink)' : '#fff',
            color: on ? 'var(--cream)' : 'var(--muted-2)',
            fontWeight: on ? 500 : 400,
            borderRight: i < options.length - 1 ? '1px solid var(--border-soft)' : 'none',
            borderTop: 'none',
            borderBottom: 'none',
            borderLeft: 'none',
            cursor: interactive ? 'pointer' : 'default',
            fontFamily: 'inherit',
            transition: 'background 0.12s, color 0.12s',
          };
          if (interactive) {
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange?.(v)}
                className={`wa-qseg is-tappable${on ? ' is-on' : ''}`}
                aria-pressed={on}
                title={lbl}
                style={segStyle}
              >
                {lbl}
              </button>
            );
          }
          return (
            <div key={v} className={`wa-qseg${on ? ' is-on' : ''}`} style={segStyle}>
              {lbl}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── QuestionBlock — expanded form question with sub-label ─────────────────

export function QuestionBlock({ num, q, hint, options, value, onChange }: {
  num: string; q: string; hint: string;
  options: [string, string, string][];
  value: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', letterSpacing: '0.08em' }}>{num}</span>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{q}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginLeft: 4 }}>{hint}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(([v, label, sub]) => {
          const on = v === value;
          return (
            <button
              key={v}
              onClick={() => onChange?.(v)}
              style={{
                flex: 1, padding: '9px 10px', textAlign: 'left',
                background: on ? 'var(--ink)' : '#fff',
                color: on ? 'var(--cream)' : 'var(--ink)',
                border: '1px solid ' + (on ? 'var(--ink)' : 'var(--rule)'),
                borderRadius: 4, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 2,
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 10.5, opacity: 0.7, fontFamily: 'var(--font-mono)' }}>{sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── MatrixDot ──────────────────────────────────────────────────────────────

export function MatrixDot({
  initials, color, teamAuto, flagged, title, x, y, size = 30, active, onClick,
}: {
  initials: string; color: string; teamAuto: AutoVerdict;
  flagged?: boolean; title?: string; x: number; y: number;
  size?: number; active?: boolean; onClick?: () => void;
}) {
  const fill = teamAuto === 'yes'   ? 'var(--rust)'
             : teamAuto === 'maybe' ? 'var(--amber)'
             : teamAuto === 'no'    ? '#8a8170'
             : '#fff';
  const isUnclassified = teamAuto === 'unclassified';
  const textColor = isUnclassified ? 'var(--ink)' : '#fff';
  return (
    <div
      onClick={onClick}
      title={title}
      className="wa-dot-activity"
      style={{
        left: `${x}%`, top: `${y}%`,
        width: size, height: size,
        background: fill,
        border: active ? '2.5px solid var(--ink)'
              : isUnclassified ? '1.5px dashed var(--muted-2)'
              : flagged ? '2px solid var(--ink)' : '1.5px solid rgba(0,0,0,0.15)',
        color: textColor,
        fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
        boxShadow: active ? '0 0 0 4px rgba(28,26,22,0.08), 0 4px 12px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.08)',
        zIndex: active ? 10 : 1,
      }}
    >
      {initials}
      {flagged ? (
        <span style={{ position: 'absolute', top: -6, right: -6, fontSize: 11, lineHeight: 1, color: 'var(--flag)' }}>★</span>
      ) : null}
    </div>
  );
}

// ── LegendDot ──────────────────────────────────────────────────────────────

export function LegendDot({ color, dashed, label }: { color: string; dashed?: boolean; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        width: 11, height: 11, borderRadius: '50%',
        background: color,
        border: dashed ? '1.5px dashed var(--muted-2)' : '1.5px solid rgba(0,0,0,0.15)',
        flexShrink: 0,
      }} />
      {label}
    </span>
  );
}

// ── DetailRow ──────────────────────────────────────────────────────────────

export function DetailRow({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', width: 96 }}>{k}</span>
      <Chip tone={tone}>{v}</Chip>
    </div>
  );
}
