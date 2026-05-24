// Work Audit — in-memory store
// Spec: 02-data-model/*, 10-business-rules/*

export type TimePerOccurrence = '<30m' | '30m-2h' | 'half-day' | 'day+';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
// CANONICAL: energizing/fine/tedious/draining (not neutral) — see IMPLEMENTATION-INDEX.md
export type Energy = 'energizing' | 'fine' | 'tedious' | 'draining';
export type AutoVerdict = 'yes' | 'maybe' | 'no' | 'unclassified';
export type SessionStatus = 'lobby' | 'active' | 'discussion' | 'done';
export type Role = 'IC' | 'EM' | 'PM' | 'UX' | 'Other';

export type Participant = {
  id: string;           // socket.id (rebound on reconnect)
  name: string;
  role: Role;
  joinedAt: Date;
  color: string;        // from AVATAR_COLORS palette
  initials: string;     // computed by makeInitials()
};

export type EditHistoryEntry = {
  who: string;
  what: string;
  at: Date;
};

export type Activity = {
  id: string;           // full UUID v4 for engineer; 8-char for merged result
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
  createdAt: Date;
  editedBy?: string;
  editHistory: EditHistoryEntry[];
  // merge support — spec: 02-data-model/activity.md, 10-business-rules/merge-rules.md
  mergedFromIds?: string[];
  mergedFromNames?: string[];
  mergedFromInitials?: string[];
  mergedFromColors?: string[];
  reportedBy?: string[];
  reportedByInitials?: string[];
  reportedByColors?: string[];
  mergedIntoId?: string;      // set on source when merged into a new card
  isMergedSource?: boolean;
  // related activities — spec: 05-real-time/client-to-server.md activity:relate
  relatedTo?: string[];
};

export type Session = {
  id: string;                   // 8-char truncated UUID
  name: string;
  facilitatorId: string;        // socket.id of facilitator (updated on reconnect)
  facilitatorName: string;
  facilitatorToken: string;     // UUID v4 secret; stored as ?token= in URL
  status: SessionStatus;        // forward-only: lobby->active->discussion->done
  submissionWindowMin: number;  // 0 = untimed
  liveTeamFeed: boolean;
  recallPrompts: string[];
  enabledCategories: string[];  // min 1 required; PATCH rejects empty
  createdAt: Date;
  startedAt?: Date;
  closedAt?: Date;
  // facilitator NOT in participants — spec: 02-data-model/participant.md
  participants: Map<string, Participant>;
  activities: Map<string, Activity>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const AVATAR_COLORS = [
  '#b14d2f', '#6b7d5a', '#c8945f', '#5a7a8a',
  '#7a5a8a', '#3a342c', '#4a6a7a', '#8a5a3a',
];

// spec: 02-data-model/enumerations.md
export const TPO_HOURS: Record<TimePerOccurrence, number> = {
  '<30m': 0.5, '30m-2h': 1.25, 'half-day': 4, 'day+': 8,
};

export const FREQ_PER_WK: Record<Frequency, number> = {
  daily: 5, weekly: 1, monthly: 0.23, quarterly: 0.077, adhoc: 0.3,
};

export const ENERGY_MULTIPLIER: Record<Energy, number> = {
  energizing: 0.5, fine: 1.0, tedious: 1.5, draining: 2.0,
};

// spec: 02-data-model/calculations.md
export function effortHrsPerWk(a: Pick<Activity, 'tpo' | 'freq'>): number {
  return TPO_HOURS[a.tpo] * FREQ_PER_WK[a.freq];
}

export function effortDisplay(hrs: number): string {
  if (hrs < 1)   return '<1 h/wk';
  if (hrs < 1.5) return '~1 h/wk';
  if (hrs < 3)   return `~${hrs.toFixed(1)} h/wk`;
  if (hrs < 8)   return `~${Math.round(hrs)} h/wk`;
  return '8+ h/wk';
}

export function perceivedCost(a: Pick<Activity, 'tpo' | 'freq' | 'energy'>): number {
  return effortHrsPerWk(a) * ENERGY_MULTIPLIER[a.energy];
}

// spec: 02-data-model/calculations.md — matrix coordinates
// X = min(92, sqrt(h/12)*100); Y = fixed per energy
export function matrixCoords(a: Pick<Activity, 'tpo' | 'freq' | 'energy'>): { x: number; y: number } {
  const h = effortHrsPerWk(a);
  const x = Math.min(92, Math.sqrt(h / 12) * 100);
  const yMap: Record<Energy, number> = {
    draining: 12, tedious: 37, fine: 63, energizing: 88,
  };
  return { x, y: yMap[a.energy] };
}

// spec: 02-data-model/participant.md — initials algorithm
export function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// spec: 10-business-rules/merge-rules.md
// Jaccard similarity on word tokens (len > 2)
export function titleSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const aWords = new Set(tokenize(a));
  const bWords = new Set(tokenize(b));
  if (aWords.size === 0 && bWords.size === 0) return 0;
  const intersection = [...aWords].filter(w => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union > 0 ? intersection / union : 0;
}

// spec: 04-facilitator-flow/merge-modal.md — merge similarity score
export function mergeSimilarity(
  a: Pick<Activity, 'title' | 'tpo' | 'freq'>,
  b: Pick<Activity, 'title' | 'tpo' | 'freq'>
): number {
  const sem = titleSimilarity(a.title, b.title);
  const sameFreq = a.freq === b.freq ? 1 : 0;
  const sameTpo  = a.tpo  === b.tpo  ? 1 : 0;
  return 0.85 * sem + 0.10 * sameFreq + 0.05 * sameTpo;
}

// spec: 03-engineer-flow/suggestions.md — group prefix for dedup
export function suggestionKey(title: string): string {
  return title.trim().toLowerCase().slice(0, 30);
}

// ── In-memory state ───────────────────────────────────────────────────────────

const sessions = new Map<string, Session>();

export default sessions;
