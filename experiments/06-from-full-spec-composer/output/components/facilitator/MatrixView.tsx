'use client';

import type { Activity, SerializedSession } from '@/lib/domain/types';
import { TEAM_AUTO_LABELS } from '@/lib/domain/enums';
import {
  ENERGY_LABELS,
  FREQ_LABELS,
  TPO_LABELS,
} from '@/lib/domain/enums';
import { matrixPosition, matrixQuadrant } from '@/lib/domain/calculations';
import { emitActivityClassify, emitActivityFlag } from '@/lib/socket';
import { EffortPill } from '@/components/EffortPill';
import { Avatar, ClassifyBtn, FacActions } from '@/components/ui';
import { PanZoomCanvas } from './PanZoomCanvas';
import { MatrixAxisLabels, MatrixLegend, MatrixPlot } from './MatrixPlot';

function zoneChip(x: number, y: number): { label: string; className: string } {
  const q = matrixQuadrant(x, y);
  if (q === 'priority') return { label: '↗ PRIORITY ZONE', className: 'is-rust' };
  if (q === 'tolerable') return { label: '↖ TOLERABLE', className: '' };
  if (q === 'strategic') return { label: '↘ STRATEGIC', className: '' };
  return { label: '↙ HEALTHY DEFAULT', className: 'is-sage' };
}

export function MatrixView({
  session,
  selected,
  onSelect,
  token,
  onEdit,
  onMerge,
  onDelete,
}: {
  session: SerializedSession;
  selected: Activity | null;
  onSelect: (a: Activity) => void;
  token: string;
  onEdit: (a: Activity) => void;
  onMerge: (a: Activity) => void;
  onDelete: (a: Activity) => void;
}) {
  const visible = session.activities.filter((a) => !a.isMergedSource);
  const selectedRank = selected ? visible.findIndex((a) => a.id === selected.id) + 1 : 0;
  const pos = selected ? matrixPosition(selected) : null;
  const zone = pos ? zoneChip(pos.x, pos.y) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16 }}>
        <p className="wa-eyebrow">Priority view · energy × effort · color = team verdict</p>
        <h2 className="wa-display" style={{ fontSize: 22, margin: '4px 0 12px' }}>
          Where does the team bleed time on draining work?
        </h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span className="wa-chip">All roles ▾</span>
          <span className="wa-chip">All cadences ▾</span>
        </div>
        <MatrixLegend />
        <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: 12, paddingLeft: 80 }}>
          <PanZoomCanvas style={{ height: '100%', borderRadius: 6 }}>
            <MatrixPlot activities={visible} selectedId={selected?.id} onSelect={onSelect} />
          </PanZoomCanvas>
          <MatrixAxisLabels />
        </div>
      </div>
      <div className="wa-sidebar">
        {selected ? (
          <>
            <p className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)', marginBottom: 12 }}>
              Selected · {selectedRank} of {visible.length}
            </p>
            <div className="wa-activity-title" style={{ fontSize: 19 }}>
              {selected.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Avatar initials={selected.participantInitials} color={selected.participantColor} size="sm" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{selected.participantName}</div>
                <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>
                  IC
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <EffortPill activity={selected} size="lg" />
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Time / occ', chip: TPO_LABELS[selected.tpo].short },
                { label: 'Cadence', chip: FREQ_LABELS[selected.freq].short },
                { label: 'Energy', chip: ENERGY_LABELS[selected.energy].short },
                { label: 'Team verdict', chip: TEAM_AUTO_LABELS[selected.teamAuto].short },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>
                    {row.label}
                  </span>
                  <span className="wa-chip">{row.chip}</span>
                </div>
              ))}
            </div>
            {zone && (
              <div style={{ marginTop: 12 }}>
                <span className={`wa-chip ${zone.className}`}>{zone.label}</span>
              </div>
            )}
            <hr className="wa-rule" style={{ margin: '16px 0' }} />
            <p className="wa-eyebrow">↳ Team verdict · automatable?</p>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {(['yes', 'maybe', 'no'] as const).map((v) => (
                <ClassifyBtn
                  key={v}
                  label={TEAM_AUTO_LABELS[v].long}
                  sub={TEAM_AUTO_LABELS[v].short}
                  tone={v === 'yes' ? 'rust' : v === 'maybe' ? 'amber' : 'neutral'}
                  active={selected.teamAuto === v}
                  onClick={() =>
                    emitActivityClassify({
                      sessionId: session.id,
                      activityId: selected.id,
                      verdict: v,
                      token,
                    })
                  }
                />
              ))}
            </div>
            <button
              type="button"
              className={selected.flagged ? 'wa-btn is-ghost' : 'wa-btn is-rust'}
              style={{ marginTop: 12, width: '100%' }}
              onClick={() =>
                emitActivityFlag({
                  sessionId: session.id,
                  activityId: selected.id,
                  token,
                  flagged: !selected.flagged,
                })
              }
            >
              {selected.flagged ? '✕ Unflag' : '★ Flag for next quarter'}
            </button>
            <div style={{ marginTop: 12 }}>
              <FacActions
                visible
                onEdit={() => onEdit(selected)}
                onMerge={() => onMerge(selected)}
                onRemove={() => onDelete(selected)}
              />
            </div>
            {selected.discussionNote && (
              <div style={{ marginTop: 16 }}>
                <p className="wa-eyebrow">↳ TEAM DISCUSSION NOTE</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>{selected.discussionNote}</p>
              </div>
            )}
          </>
        ) : (
          <p style={{ color: 'var(--muted)' }}>Click a dot to inspect…</p>
        )}
      </div>
    </div>
  );
}
