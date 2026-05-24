'use client';

import { effortColor, effortHoursForActivity, formatEffort } from '@/lib/domain/calculations';
import { TPO_LABELS, FREQ_LABELS } from '@/lib/domain/enums';
import type { Activity } from '@/lib/domain/types';

export function EffortPill({
  activity,
  size = 'md',
}: {
  activity: Pick<Activity, 'tpo' | 'freq'>;
  size?: 'sm' | 'md' | 'lg';
}) {
  const hrs = effortHoursForActivity(activity);
  const color = effortColor(hrs);
  const tone = color === 'sage' ? 'is-sage' : color === 'amber' ? 'is-amber' : 'is-rust';
  const fontSize = size === 'sm' ? '10.5px' : size === 'lg' ? '13px' : '12px';
  const padding = size === 'sm' ? '2px 6px' : size === 'lg' ? '5px 10px' : '3px 8px';

  return (
    <span
      className={`wa-chip ${tone}`}
      style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize, padding }}
      title={`${TPO_LABELS[activity.tpo].long} × ${FREQ_LABELS[activity.freq].long}`}
    >
      ◷ {formatEffort(hrs)}
    </span>
  );
}
