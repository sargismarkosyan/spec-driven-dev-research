// Shared types for client and server. Dates are strings in the client (JSON serialized).

export const ALL_CATEGORIES = [
  "Yesterday & this week",
  "Weekly meetings",
  "Monthly rituals",
  "On-call & incidents",
  "Quarterly cycles",
  "Manual chores",
  "Handoffs & coordination",
  "Things I wish we automated",
  "Other recurring work",
] as const;

export const CATEGORY_EXAMPLES: Record<string, string[]> = {
  "Yesterday & this week": ["Reviewed PRs", "Fixed production bugs", "Attended team syncs", "Wrote or updated docs"],
  "Weekly meetings": ["Team standup", "Sprint planning", "1:1s with manager", "Design review"],
  "Monthly rituals": ["Monthly report", "Retrospective", "All-hands prep", "OKR progress check"],
  "On-call & incidents": ["On-call rotation", "Incident response", "Postmortem writing", "Alert triage"],
  "Quarterly cycles": ["Performance reviews", "Roadmap planning", "Budget/headcount review", "Quarterly business review"],
  "Manual chores": ["Deploy releases manually", "Rotate secrets/credentials", "Clean up stale branches", "Update dependency versions"],
  "Handoffs & coordination": ["Context-switching requests", "Async Slack coordination", "Cross-team syncs", "Writing status updates"],
  "Things I wish we automated": ["Manual data exports", "Slack deploy notifications", "Metrics collection", "Test environment setup"],
  "Other recurring work": ["Ad-hoc requests", "Tribal knowledge sharing", "Tooling maintenance", "Unblocking teammates"],
};

export type Session = {
  id: string;
  name: string;
  createdAt: string;
  facilitatorToken: string;
  status: 'open' | 'reviewing' | 'closed';
  submissionEndsAt: string | null;
  enabledCategories: string[];
  liveFeedEnabled: boolean;
};

export type Participant = {
  id: string;
  sessionId: string;
  name: string;
  role: 'IC' | 'EM' | 'PM' | 'UX' | 'other';
  joinedAt: string;
};

export type EditEntry = {
  editedBy: string;
  editedAt: string;
  changes: Record<string, { from: unknown; to: unknown }>;
};

export type Activity = {
  id: string;
  sessionId: string;
  participantId: string;
  contributorIds: string[];
  title: string;
  tpo: '<30m' | '30m-2h' | 'half-day' | 'day+';
  freq: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
  energy: 'energizing' | 'neutral' | 'draining';
  teamAuto: 'yes' | 'maybe' | 'no' | 'unclassified';
  flaggedByFacilitator: boolean;
  mergedFrom: string[] | null;
  editHistory: EditEntry[];
  createdAt: string;
  updatedAt: string;
};

export const TPO_HOURS: Record<Activity['tpo'], number> = {
  '<30m': 0.5,
  '30m-2h': 1.25,
  'half-day': 4,
  'day+': 8,
};

export const FREQ_PER_WK: Record<Activity['freq'], number> = {
  daily: 5,
  weekly: 1,
  monthly: 0.23,
  quarterly: 0.077,
  adhoc: 0.3,
};

export function effortHrsPerWk(a: Pick<Activity, 'tpo' | 'freq'>): number {
  return TPO_HOURS[a.tpo] * FREQ_PER_WK[a.freq];
}

export function effortDisplay(hrs: number): string {
  if (hrs < 1) return '<1 h/wk';
  if (hrs < 1.5) return '~1 h/wk';
  if (hrs < 8) return `~${hrs.toFixed(1)} h/wk`;
  return '8+ h/wk';
}

export function matrixX(a: Pick<Activity, 'tpo' | 'freq'>): number {
  return Math.min(effortHrsPerWk(a) / 8, 1);
}

export function matrixY(a: Pick<Activity, 'energy'>): number {
  return ({ energizing: 0, neutral: 0.5, draining: 1 } as const)[a.energy];
}
