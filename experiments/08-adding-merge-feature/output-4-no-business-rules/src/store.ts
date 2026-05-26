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
  relatedTo?: string[];
  // Merge tracking — merged result activity
  mergedFromIds?: string[];
  mergedFromNames?: string[];
  mergedFromInitials?: string[];
  mergedFromColors?: string[];
  reportedBy?: string[];
  reportedByInitials?: string[];
  reportedByColors?: string[];
  // Merge tracking — source activity
  isMergedSource?: boolean;
  mergedIntoId?: string;
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

// ── Similarity scoring ────────────────────────────────────────────────────────

/**
 * Compute a similarity score [0..1] between two activities.
 * Uses Jaccard word-overlap on titles (primary) combined with
 * matching tpo/freq/energy fields (secondary signals).
 */
export function activitySimilarity(a: Pick<Activity, 'title' | 'tpo' | 'freq' | 'energy'>, b: Pick<Activity, 'title' | 'tpo' | 'freq' | 'energy'>): number {
  // Title Jaccard — tokenise to lowercased words longer than 2 chars
  const tokenise = (s: string) =>
    new Set(s.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const aWords = tokenise(a.title);
  const bWords = tokenise(b.title);
  const intersection = new Set([...aWords].filter(w => bWords.has(w)));
  const union = new Set([...aWords, ...bWords]);
  const titleScore = union.size > 0 ? intersection.size / union.size : 0;

  // Attribute match bonus — each matching field adds a small boost
  let attrScore = 0;
  if (a.tpo    === b.tpo)    attrScore += 0.10;
  if (a.freq   === b.freq)   attrScore += 0.10;
  if (a.energy === b.energy) attrScore += 0.05;

  // Weight: 75% title, 25% attributes
  return Math.min(1, titleScore * 0.75 + attrScore);
}

// ── In-memory state ──────────────────────────────────────────────────────────

const sessions = new Map<string, Session>();

export default sessions;
