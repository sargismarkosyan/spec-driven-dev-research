export type Tpo = '<30m' | '30m-2h' | 'half-day' | 'day+';
export type Freq = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
export type Energy = 'energizing' | 'fine' | 'tedious' | 'draining';
export type TeamAuto = 'yes' | 'maybe' | 'no' | 'unclassified';
export type Role = 'IC' | 'EM' | 'PM' | 'UX' | 'Other';
export type SessionStatus = 'lobby' | 'active' | 'discussion' | 'done';

export const TPO_HOURS: Record<Tpo, number> = {
  '<30m': 0.5,
  '30m-2h': 1.25,
  'half-day': 4,
  'day+': 8,
};

export const FREQ_MULTIPLIER: Record<Freq, number> = {
  daily: 5,
  weekly: 1,
  monthly: 0.23,
  quarterly: 0.077,
  adhoc: 0.3,
};

export const ENERGY_MULTIPLIER: Record<Energy, number> = {
  energizing: 0.5,
  fine: 1.0,
  tedious: 1.5,
  draining: 2.0,
};

export const TPO_LABELS: Record<Tpo, { long: string; short: string; subtitle: string }> = {
  '<30m': { long: 'Under 30 min', short: '<30 min', subtitle: 'minutes' },
  '30m-2h': { long: '30 min – 2 hrs', short: '30m–2h', subtitle: 'a couple hours' },
  'half-day': { long: 'Half day', short: '½ day', subtitle: 'a chunk' },
  'day+': { long: 'A full day or more', short: '1+ day', subtitle: 'all in' },
};

export const FREQ_LABELS: Record<Freq, { long: string; short: string; subtitle: string }> = {
  daily: { long: 'Daily', short: 'Daily', subtitle: 'every day' },
  weekly: { long: 'Weekly', short: 'Wkly', subtitle: 'each week' },
  monthly: { long: 'Monthly', short: 'Mthly', subtitle: 'each month' },
  quarterly: { long: 'Quarterly', short: 'Qtrly', subtitle: 'each quarter' },
  adhoc: { long: 'Ad hoc', short: 'Ad hoc', subtitle: 'unpredictable' },
};

export const ENERGY_LABELS: Record<Energy, { long: string; short: string; subtitle: string }> = {
  energizing: { long: 'Energizes me', short: 'Energizes', subtitle: 'I like doing it' },
  fine: { long: "It's fine", short: 'Fine', subtitle: 'No complaints' },
  tedious: { long: 'Tedious', short: 'Tedious', subtitle: 'Rather skip it' },
  draining: { long: 'Drains me', short: 'Drains', subtitle: 'I dread it' },
};

export const TEAM_AUTO_LABELS: Record<TeamAuto, { long: string; short: string }> = {
  yes: { long: 'Automatable', short: 'Auto' },
  maybe: { long: 'Maybe', short: 'Maybe' },
  no: { long: 'Manual forever', short: 'Manual' },
  unclassified: { long: 'Needs review', short: 'Unclassified' },
};

export const ROLE_LABELS: Record<Role, string> = {
  IC: 'Individual Contributor',
  EM: 'Engineering Manager',
  PM: 'Product Manager',
  UX: 'UX / Design',
  Other: 'Other',
};

export function isValidTpo(value: string): value is Tpo {
  return value in TPO_HOURS;
}

export function isValidFreq(value: string): value is Freq {
  return value in FREQ_MULTIPLIER;
}

export function isValidEnergy(value: string): value is Energy {
  return value in ENERGY_MULTIPLIER;
}

export function isValidTeamAuto(value: string): value is TeamAuto {
  return value in TEAM_AUTO_LABELS;
}

export function isValidRole(value: string): value is Role {
  return value in ROLE_LABELS;
}

export function isValidSessionStatus(value: string): value is SessionStatus {
  return value === 'lobby' || value === 'active' || value === 'discussion' || value === 'done';
}
