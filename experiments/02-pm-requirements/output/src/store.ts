// In-memory store — domain types for Toil Tracker

export type ParticipantRole = 'IC' | 'EM' | 'PM' | 'UX' | 'Other';

export type Participant = {
  id: string;
  name: string;
  role: ParticipantRole;
  joinedAt: Date;
  isFacilitator: boolean;
};

export type TimePerOccurrence = 'lt30' | '30to2h' | 'halfday' | 'fullday';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
export type Energy = 'energizes' | 'neutral' | 'drains';
export type AutoVerdict = 'yes' | 'maybe' | 'no' | null;

export type EditHistoryEntry = {
  editedBy: string;
  editedByRole: 'facilitator' | 'participant';
  editedAt: Date;
  field: string;
  from: string;
  to: string;
};

export type Activity = {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  title: string;
  tpo: TimePerOccurrence;
  frequency: Frequency;
  energy: Energy;
  effortHrsPerWeek: number;
  autoVerdict: AutoVerdict;
  flagged: boolean;
  discussionNote: string;
  editHistory: EditHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
  mergedFrom?: string[];   // ids of activities merged into this
  mergedInto?: string;     // id of activity this was merged into
  relatedTo?: string[];    // "treat as related" links
};

export type PromptCategory =
  | 'yesterday'
  | 'meetings'
  | 'rituals'
  | 'oncall'
  | 'quarterly'
  | 'chores'
  | 'handoffs'
  | 'automation'
  | 'other';

export type SessionStatus = 'lobby' | 'open' | 'reviewing' | 'closed';

export type Session = {
  id: string;
  name: string;
  facilitatorToken: string;
  status: SessionStatus;
  windowMinutes: number | null;   // null = untimed
  windowStartedAt: Date | null;
  enabledCategories: PromptCategory[];
  liveFeedEnabled: boolean;
  participants: Map<string, Participant>;
  activities: Activity[];
  discussionQueue: string[];     // ordered activity ids for discussion
  discussionIndex: number;
  createdAt: Date;
};

export type AppState = {
  sessions: Map<string, Session>;
};

const state: AppState = {
  sessions: new Map(),
};

// ── Effort calculation ─────────────────────────────────────────────────────

const TPO_HOURS: Record<TimePerOccurrence, number> = {
  lt30: 0.4,
  '30to2h': 1.25,
  halfday: 4,
  fullday: 8,
};

const FREQ_PER_WEEK: Record<Frequency, number> = {
  daily: 5,
  weekly: 1,
  monthly: 0.25,
  quarterly: 0.077,
  adhoc: 0.5,
};

export function calcEffort(tpo: TimePerOccurrence, freq: Frequency): number {
  return Math.round(TPO_HOURS[tpo] * FREQ_PER_WEEK[freq] * 100) / 100;
}

// ── Similarity scoring for merge ──────────────────────────────────────────

export function similarityScore(a: Activity, b: Activity): {
  total: number;
  semantic: number;
  cadence: number;
  duration: number;
} {
  const wordsA = new Set(a.title.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.title.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  const semantic = union === 0 ? 0 : Math.round((intersection / union) * 100);
  const cadence = a.frequency === b.frequency ? 100 : 0;
  const duration = a.tpo === b.tpo ? 100 : 0;
  const total = Math.round(semantic * 0.6 + cadence * 0.2 + duration * 0.2);
  return { total, semantic, cadence, duration };
}

export default state;
