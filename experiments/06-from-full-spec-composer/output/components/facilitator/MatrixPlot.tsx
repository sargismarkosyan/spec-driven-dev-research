'use client';

import type { Activity } from '@/lib/domain/types';
import type { TeamAuto } from '@/lib/domain/enums';
import { clusterMatrixDots } from '@/lib/client/matrixCluster';

function dotColor(teamAuto: TeamAuto): string {
  if (teamAuto === 'yes') return 'var(--rust)';
  if (teamAuto === 'maybe') return 'var(--amber)';
  if (teamAuto === 'no') return '#8a8170';
  return '#fff';
}

function dotBorder(activity: Activity, selected: boolean): string {
  if (selected) return '2.5px solid var(--ink)';
  if (activity.teamAuto === 'unclassified') return '1.5px dashed var(--muted-2)';
  if (activity.flagged) return '2px solid var(--ink)';
  return '1.5px solid rgba(0,0,0,0.15)';
}

export function MatrixPlot({
  activities,
  selectedId,
  focusedId,
  mini = false,
  onSelect,
}: {
  activities: Activity[];
  selectedId?: string | null;
  focusedId?: string | null;
  mini?: boolean;
  onSelect?: (activity: Activity) => void;
}) {
  const dots = clusterMatrixDots(activities);

  return (
    <div className="wa-matrix" style={mini ? { minHeight: 200, height: 200 } : undefined}>
      <div
        className="wa-matrix-quad-priority"
        style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '50%' }}
      />
      <div
        className="wa-matrix-quad-healthy"
        style={{ position: 'absolute', bottom: 0, left: 0, width: '50%', height: '50%' }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: 0,
          borderTop: '1px dashed var(--muted-2)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 0,
          borderLeft: '1px dashed var(--muted-2)',
          pointerEvents: 'none',
        }}
      />
      <div className="wa-quad-label" style={{ top: mini ? 4 : 8, left: mini ? 4 : 8, color: 'var(--muted-2)', fontSize: mini ? 8 : undefined }}>
        ↖ TOLERABLE
      </div>
      <div className="wa-quad-label" style={{ top: mini ? 4 : 8, right: mini ? 4 : 8, color: 'var(--rust)', fontSize: mini ? 8 : undefined }}>
        ↗ PRIORITY ZONE
      </div>
      <div className="wa-quad-label" style={{ bottom: mini ? 4 : 8, left: mini ? 4 : 8, color: 'var(--sage)', fontSize: mini ? 8 : undefined }}>
        ↙ HEALTHY DEFAULT
      </div>
      <div className="wa-quad-label" style={{ bottom: mini ? 4 : 8, right: mini ? 4 : 8, color: 'var(--muted-2)', fontSize: mini ? 8 : undefined }}>
        ↘ STRATEGIC
      </div>
      {dots.map(({ activity, x, y }) => {
        const isSelected = selectedId === activity.id;
        const isFocused = focusedId === activity.id;
        const isActive = isSelected || isFocused;
        const size = mini
          ? isFocused
            ? 34
            : 22
          : activity.flagged
            ? 36
            : 30;
        const activeGlow = '0 0 0 4px rgba(28, 26, 22, 0.1), 0 4px 12px rgba(0, 0, 0, 0.14)';

        return (
          <div
            key={activity.id}
            className="wa-dot-activity"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              background: dotColor(activity.teamAuto),
              border: dotBorder(activity, isActive),
              boxShadow: isActive ? activeGlow : undefined,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(activity);
            }}
            title={activity.title}
          >
            {activity.flagged && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  fontSize: mini ? 9 : 11,
                  color: 'var(--flag)',
                  lineHeight: 1,
                }}
              >
                ★
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MatrixLegend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: 'var(--muted)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--rust)' }} />
        Automatable
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)' }} />
        Maybe
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#8a8170' }} />
        Manual
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#fff',
            border: '1px dashed var(--muted-2)',
          }}
        />
        Unclassified
      </span>
      <span>★ Flagged</span>
    </div>
  );
}

export function MatrixAxisLabels() {
  return (
    <>
      <p
        className="wa-mono"
        style={{
          textAlign: 'center',
          fontSize: 10,
          color: 'var(--muted-2)',
          margin: '8px 0 0',
          letterSpacing: '0.04em',
        }}
      >
        ← LOW EFFORT · EFFORT (~ h/wk) · HIGH EFFORT →
      </p>
      <p
        className="wa-mono"
        style={{
          position: 'absolute',
          left: -72,
          top: '50%',
          transform: 'rotate(-90deg) translateX(-50%)',
          transformOrigin: 'center',
          fontSize: 10,
          color: 'var(--muted-2)',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        ← ENERGIZING · ENERGY · DRAINING →
      </p>
    </>
  );
}
