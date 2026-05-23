export type Role = 'engineer' | 'facilitator';
export type Energy = 'drains' | 'energizes';
export type Verdict = 'automate' | 'eliminate' | 'handoff' | 'keep';
export type Phase = 'lobby' | 'input' | 'discussion' | 'closed';

export type Participant = {
  id: string;
  name: string;
  role: Role;
  sessionId: string;
  joinedAt: Date;
};

export type Activity = {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  description: string;
  durationMinutes: number;
  frequencyPerWeek: number;
  weeklyMinutes: number;
  energy: Energy;
  verdict?: Verdict;
  flagged: boolean;
  mergedFromIds: string[];
  mergedAuthorNames: string[];
  createdAt: Date;
};

export type Session = {
  id: string;
  facilitatorId: string;
  phase: Phase;
  createdAt: Date;
};

export type AppState = {
  participants: Map<string, Participant>;
  sessions: Map<string, Session>;
  activities: Activity[];
};

const state: AppState = {
  participants: new Map(),
  sessions: new Map(),
  activities: [],
};

export default state;
