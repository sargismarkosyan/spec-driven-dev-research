// Work Audit — in-memory store
// v0.3 data model: 3 engineer questions (time/freq/energy) + team-classified automatability

export type TimePerOccurrence = '<30m' | '30m-2h' | 'half-day' | 'day+';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
export type Energy = 'energizing' | 'fine' | 'tedious' | 'draining';
export type AutoVerdict = 'yes' | 'maybe' | 'no' | 'unclassified';
export type SessionStatus = 'lobby' | 'active' | 'discussion' | 'done';
export type Role = 'IC' | 'EM' | 'PM' | 'UX' | 'Other';

export type Participant = {
  id: string;         // socket.id
  name: string;
  role: Role;
  joinedAt: Date;
  color: string;      // avatar color
  initials: string;
  isFacilitator: boolean;
};

export type EditHistoryEntry = {
  who: string;
  what: string;
  at: Date;
};

export type Activity = {
  id: string;
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
  // Merge tracking
  mergedIntoId?: string;   // set on source activities when consumed by a merge
  mergeSourceIds?: string[]; // set on the merged result activity
  relatedTo?: string[];    // related activity IDs
};

export type Session = {
  id: string;
  name: string;
  facilitatorId: string;
  facilitatorName: string;
  facilitatorToken: string;   // secret for facilitator actions
  status: SessionStatus;
  submissionWindowMin: number; // 0 = untimed
  liveTeamFeed: boolean;
  recallPrompts: string[];
  enabledCategories: string[]; // category IDs shown to engineers
  createdAt: Date;
  startedAt?: Date;
  closedAt?: Date;
  participants: Map<string, Participant>;
  activities: Map<string, Activity>;
};

// ── Constants ────────────────────────────────────────────────────────────────

export const AVATAR_COLORS = [
  '#b14d2f', '#6b7d5a', '#c8945f', '#5a7a8a',
  '#7a5a8a', '#3a342c', '#4a6a7a', '#8a5a3a',
];

export const TPO_HOURS: Record<TimePerOccurrence, number> = {
  '<30m': 0.5, '30m-2h': 1.25, 'half-day': 4, 'day+': 8,
};

export const FREQ_PER_WK: Record<Frequency, number> = {
  daily: 5, weekly: 1, monthly: 0.23, quarterly: 0.077, adhoc: 0.3,
};

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

export function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Similarity helpers ────────────────────────────────────────────────────────

/**
 * Jaccard index on significant title tokens (length > 2, alphanumeric, lowercase).
 */
export function titleSimilarity(a: string, b: string): number {
  const tokenize = (s: string) => new Set(
    s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2)
  );
  const sa = tokenize(a);
  const sb = tokenize(b);
  if (sa.size === 0 && sb.size === 0) return 0;
  const intersection = new Set([...sa].filter(x => sb.has(x)));
  const union = new Set([...sa, ...sb]);
  return intersection.size / union.size;
}

/**
 * combinedScore = 0.85 × titleSimilarity + 0.10 × (sameFreq ? 1 : 0) + 0.05 × (sameTpo ? 1 : 0)
 */
export function activitySimilarity(a: Activity, b: Activity): number {
  const ts = titleSimilarity(a.title, b.title);
  return 0.85 * ts
    + 0.10 * (a.freq === b.freq ? 1 : 0)
    + 0.05 * (a.tpo  === b.tpo  ? 1 : 0);
}

// ── In-memory state ──────────────────────────────────────────────────────────

const sessions = new Map<string, Session>();

export default sessions;
