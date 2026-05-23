// In-memory store — domain types for Toil Tracker

export type TimeEstimate = 'quick' | 'medium' | 'significant';
export type Enjoyment = 'yes' | 'meh' | 'no';
export type Repetitiveness = 'yes' | 'sometimes' | 'no';
export type AutomationPotential = 'yes' | 'maybe' | 'no';

export type Session = {
  id: string;
  name: string;
  createdAt: Date;
};

export type Activity = {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  title: string;
  timeEstimate: TimeEstimate;
  enjoyment: Enjoyment;
  repetitiveness: Repetitiveness;
  automationPotential: AutomationPotential;
  flagged: boolean;
  createdAt: Date;
};

export type User = {
  id: string;
  name: string;
  sessionId: string;
  joinedAt: Date;
};

export type AppState = {
  users: Map<string, User>;
  sessions: Map<string, Session>;
  activities: Activity[];
};

const state: AppState = {
  users: new Map(),
  sessions: new Map(),
  activities: [],
};

export default state;
