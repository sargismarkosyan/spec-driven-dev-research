'use client';

import type { Activity } from '@/lib/domain/types';
import { ENERGY_LABELS } from '@/lib/domain/enums';
import { firstNameFromDisplayName } from '@/lib/domain/suggestions';
import { EffortPill } from '@/components/EffortPill';
import { Avatar } from '@/components/ui';

const ENERGY_TONE: Record<string, string> = {
  energizing: 'is-sage',
  fine: '',
  tedious: 'is-amber',
  draining: 'is-rust',
};

export function TeamFeed({
  activities,
  enabled,
}: {
  activities: Activity[];
  enabled: boolean;
}) {
  if (!enabled) return null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <p className="wa-eyebrow" style={{ margin: 0 }}>
          ↳ Team is submitting
        </p>
        <span className="wa-dot is-pulsing" aria-hidden />
      </div>
      {activities.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Activities from teammates will appear here as they submit.
        </p>
      )}
      {activities.map((a) => (
        <div key={a.id} className="wa-card" style={{ padding: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <Avatar initials={a.participantInitials} color={a.participantColor} size="sm" />
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {firstNameFromDisplayName(a.participantName)}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, lineHeight: 1.3 }}>{a.title}</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              <EffortPill activity={a} size="sm" />
              <span className={`wa-chip ${ENERGY_TONE[a.energy]}`}>
                {ENERGY_LABELS[a.energy].short}
              </span>
            </div>
            <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>
              just now
            </span>
          </div>
        </div>
      ))}
    </>
  );
}
