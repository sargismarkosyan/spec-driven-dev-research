import { matrixPosition } from '@/lib/domain/calculations';
import type { Activity } from '@/lib/domain/types';

export type ClusteredDot = {
  activity: Activity;
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function groupKey(activity: Activity): string {
  const { x, y } = matrixPosition(activity);
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

export function clusterMatrixDots(activities: Activity[]): ClusteredDot[] {
  const groups = new Map<string, Activity[]>();

  for (const activity of activities) {
    const key = groupKey(activity);
    const group = groups.get(key);
    if (group) group.push(activity);
    else groups.set(key, [activity]);
  }

  const result: ClusteredDot[] = [];

  for (const group of groups.values()) {
    const centroid = matrixPosition(group[0]);
    const count = group.length;

    if (count === 1) {
      result.push({ activity: group[0], x: centroid.x, y: centroid.y });
      continue;
    }

    const radius = Math.min(3.5 + count * 0.4, 6);

    for (let i = 0; i < count; i++) {
      let angle: number;
      if (count === 2) {
        angle = i === 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
      }

      result.push({
        activity: group[i],
        x: clamp(centroid.x + radius * Math.cos(angle), 1, 99),
        y: clamp(centroid.y + radius * Math.sin(angle), 1, 99),
      });
    }
  }

  return result;
}
