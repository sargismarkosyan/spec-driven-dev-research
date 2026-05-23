// In-memory store — domain types for Toil Tracker

export type Session = {
  id: string;
  name: string;
  createdAt: Date;
  status: 'open' | 'closed';
};

export type Role = 'engineer' | 'facilitator';

export type Participant = {
  socketId: string;
  name: string;
  role: Role;
  sessionId: string;
};

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'occasional';

export type Activity = {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  description: string;
  category: string;
  frequency: Frequency;
  minutesPerOccurrence: number;
  painLevel: number; // 1–5
  flagged: boolean;
  createdAt: Date;
};

export type AppState = {
  sessions: Map<string, Session>;
  // keyed by socketId
  participants: Map<string, Participant>;
  activities: Activity[];
};

const state: AppState = {
  sessions: new Map(),
  participants: new Map(),
  activities: [],
};

export default state;
