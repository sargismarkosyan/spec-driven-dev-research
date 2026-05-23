// Domain types for the Work Audit / Toil Tracker application

export type ParticipantRole = 'IC' | 'EM' | 'PM' | 'UX' | 'Other';
export type SessionPhase = 'lobby' | 'submission' | 'discussion' | 'closed';
export type TimePerOccurrence = '<30min' | '30min-2hr' | 'half-day' | 'full-day';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ad-hoc';
export type EnergyLevel = 'energizes' | 'neutral' | 'drains';
export type AutomatabilityVerdict = 'yes' | 'maybe' | 'no';

export type Participant = {
  id: string;
  socketId: string;
  name: string;
  role: ParticipantRole;
  joinedAt: Date;
  isOnline: boolean;
};

export type AuditEntry = {
  timestamp: Date;
  editorId: string;
  editorName: string;
  field: string;
  from: string;
  to: string;
};

export type Activity = {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  coAuthors: { id: string; name: string }[];
  title: string;
  timePerOccurrence: TimePerOccurrence;
  frequency: Frequency;
  energy: EnergyLevel;
  automatability: AutomatabilityVerdict | null;
  facilitatorNote: string;
  flagged: boolean;
  skipped: boolean;
  mergedInto: string | null;
  mergedFrom: string[];
  relatedTo: string[];
  auditLog: AuditEntry[];
  createdAt: Date;
  discussedAt: Date | null;
};

export type PromptCategory = {
  id: string;
  label: string;
  examples: string[];
};

export type Session = {
  id: string;
  name: string;
  facilitatorId: string;
  facilitatorName: string;
  phase: SessionPhase;
  submissionWindowMinutes: number | null;
  submissionStartedAt: Date | null;
  showTeamFeedToEngineers: boolean;
  enabledPromptCategoryIds: string[];
  participants: Map<string, Participant>;
  activities: Map<string, Activity>;
  discussionOrder: string[];
  discussionIndex: number;
  createdAt: Date;
};

export const DEFAULT_PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'yesterday-week',
    label: 'Yesterday & this week',
    examples: ['Daily standup', 'Sprint planning', 'Code reviews', 'Writing docs', 'Syncs with product'],
  },
  {
    id: 'weekly-meetings',
    label: 'Weekly meetings',
    examples: ['1:1 with manager', 'Team retro', 'All-hands', 'Design reviews', 'Cross-team syncs'],
  },
  {
    id: 'on-call',
    label: 'On-call & incidents',
    examples: ['Alert triage', 'Incident response', 'Post-mortems', 'Runbook updates', 'Escalation calls'],
  },
  {
    id: 'chores',
    label: 'Manual chores',
    examples: ['Deploying to staging', 'Running data migrations', 'Updating spreadsheets', 'Manual test runs', 'Provisioning accounts'],
  },
];

export function computeWeeklyHours(time: TimePerOccurrence, freq: Frequency): number {
  const timeHours: Record<TimePerOccurrence, number> = {
    '<30min': 0.33,
    '30min-2hr': 1.25,
    'half-day': 4,
    'full-day': 8,
  };
  const freqMultiplier: Record<Frequency, number> = {
    daily: 5,
    weekly: 1,
    monthly: 0.25,
    quarterly: 0.083,
    'ad-hoc': 0.1,
  };
  return timeHours[time] * freqMultiplier[freq];
}

export type AppState = {
  sessions: Map<string, Session>;
};

const state: AppState = {
  sessions: new Map(),
};

export default state;
