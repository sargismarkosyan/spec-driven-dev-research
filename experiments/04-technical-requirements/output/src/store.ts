import { randomUUID } from 'crypto';
import { effortHrsPerWk as _effortHrsPerWk, effortDisplay as _effortDisplay, TPO_HOURS, FREQ_PER_WK } from '../lib/types';

export type Session = {
  id: string;
  name: string;
  createdAt: Date;
  facilitatorToken: string;
  status: 'open' | 'reviewing' | 'closed';
  submissionEndsAt: Date | null;
  enabledCategories: string[];
  liveFeedEnabled: boolean;
};

export type Participant = {
  id: string;
  sessionId: string;
  name: string;
  role: 'IC' | 'EM' | 'PM' | 'UX' | 'other';
  joinedAt: Date;
};

export type EditEntry = {
  editedBy: string;
  editedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
};

export type AppState = {
  sessions: Map<string, Session>;
  participants: Map<string, Participant>;
  activities: Map<string, Activity>;
};

const state: AppState = {
  sessions: new Map(),
  participants: new Map(),
  activities: new Map(),
};

export function genId(len = 10): string {
  return randomUUID().replace(/-/g, '').slice(0, len);
}

export { TPO_HOURS, FREQ_PER_WK };

export function effortHrsPerWk(a: Pick<Activity, 'tpo' | 'freq'>): number {
  return _effortHrsPerWk(a);
}

export function effortDisplay(hrs: number): string {
  return _effortDisplay(hrs);
}

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
];

export default state;
