import type { Activity } from './types';
import { ENERGY_MULTIPLIER, FREQ_MULTIPLIER, TPO_HOURS } from './enums';
import type { Energy, Tpo, Freq } from './enums';

export type EffortColor = 'sage' | 'amber' | 'rust';

export type MatrixQuadrant =
  | 'priority'
  | 'tolerable'
  | 'strategic'
  | 'healthy';

export function effortHoursPerWeek(tpo: Tpo, freq: Freq): number {
  return TPO_HOURS[tpo] * FREQ_MULTIPLIER[freq];
}

export function effortHoursForActivity(activity: Pick<Activity, 'tpo' | 'freq'>): number {
  return effortHoursPerWeek(activity.tpo, activity.freq);
}

export function formatEffort(hoursPerWeek: number): string {
  if (hoursPerWeek < 1) return '<1 h/wk';
  if (hoursPerWeek < 1.5) return '~1 h/wk';
  if (hoursPerWeek < 3) return `~${hoursPerWeek.toFixed(1)} h/wk`;
  if (hoursPerWeek < 8) return `~${Math.round(hoursPerWeek)} h/wk`;
  return '8+ h/wk';
}

export function effortColor(hoursPerWeek: number): EffortColor {
  if (hoursPerWeek < 1.5) return 'sage';
  if (hoursPerWeek < 4) return 'amber';
  return 'rust';
}

export function perceivedCost(tpo: Tpo, freq: Freq, energy: Energy): number {
  return effortHoursPerWeek(tpo, freq) * ENERGY_MULTIPLIER[energy];
}

export function perceivedCostForActivity(activity: Pick<Activity, 'tpo' | 'freq' | 'energy'>): number {
  return perceivedCost(activity.tpo, activity.freq, activity.energy);
}

export function matrixX(hoursPerWeek: number): number {
  return Math.min(92, Math.sqrt(hoursPerWeek / 12) * 100);
}

const ENERGY_Y: Record<Energy, number> = {
  draining: 12,
  tedious: 37,
  fine: 63,
  energizing: 88,
};

export function matrixY(energy: Energy): number {
  return ENERGY_Y[energy];
}

export function matrixPosition(activity: Pick<Activity, 'tpo' | 'freq' | 'energy'>): {
  x: number;
  y: number;
} {
  const hours = effortHoursForActivity(activity);
  return { x: matrixX(hours), y: matrixY(activity.energy) };
}

export function matrixQuadrant(x: number, y: number): MatrixQuadrant {
  const highEffort = x > 50;
  const drainingHalf = y < 50;
  if (highEffort && drainingHalf) return 'priority';
  if (!highEffort && drainingHalf) return 'tolerable';
  if (highEffort && !drainingHalf) return 'strategic';
  return 'healthy';
}

export function deriveInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/).filter(Boolean);
  const initials = words.map((word) => word[0]?.toUpperCase() ?? '').join('');
  return initials.slice(0, 2) || '?';
}
