'use client';

import {
  ENERGY_LABELS,
  FREQ_LABELS,
  TEAM_AUTO_LABELS,
  TPO_LABELS,
} from '@/lib/domain/enums';
import type { Activity } from '@/lib/domain/types';

const TPO_TONE: Record<string, string> = {
  '<30m': 'is-sage',
  '30m-2h': '',
  'half-day': 'is-amber',
  'day+': 'is-rust',
};

const FREQ_TONE: Record<string, string> = {
  daily: 'is-rust',
  weekly: 'is-amber',
  monthly: '',
  quarterly: '',
  adhoc: 'is-sage',
};

const ENERGY_TONE: Record<string, string> = {
  energizing: 'is-sage',
  fine: '',
  tedious: 'is-amber',
  draining: 'is-rust',
};

const AUTO_TONE: Record<string, string> = {
  yes: 'is-rust',
  maybe: 'is-amber',
  no: '',
  unclassified: 'is-ghost',
};

export function ActivityChipsShort({
  activity,
  showAuto = false,
}: {
  activity: Pick<Activity, 'tpo' | 'freq' | 'energy' | 'teamAuto'>;
  showAuto?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
      <span className={`wa-chip ${TPO_TONE[activity.tpo]}`}>{TPO_LABELS[activity.tpo].short}</span>
      <span className={`wa-chip ${FREQ_TONE[activity.freq]}`}>{FREQ_LABELS[activity.freq].short}</span>
      <span className={`wa-chip ${ENERGY_TONE[activity.energy]}`}>
        {ENERGY_LABELS[activity.energy].short}
      </span>
      {showAuto && activity.teamAuto !== 'unclassified' && (
        <span className={`wa-chip ${AUTO_TONE[activity.teamAuto]}`}>
          ★ {TEAM_AUTO_LABELS[activity.teamAuto].short}
        </span>
      )}
    </div>
  );
}
