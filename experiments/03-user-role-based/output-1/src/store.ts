// In-memory store — domain types for Toil Tracker

export type Duration = 'quick' | 'medium' | 'significant';
export type Enjoyment = 'yes' | 'meh' | 'no';
export type Repetitive = 'yes' | 'sometimes' | 'no';
export type Automatable = 'yes' | 'maybe' | 'no';
export type Priority = 'high' | 'medium' | 'low';

export type Activity = {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  title: string;
  duration: Duration;
  enjoyment: Enjoyment;
  repetitive: Repetitive;
  automatable: Automatable;
  priority?: Priority;
  flagged: boolean;
  createdAt: Date;
};

export type Participant = {
  id: string;
  name: string;
  sessionId: string;
  joinedAt: Date;
};

export type Session = {
  id: string;
  title: string;
  status: 'open' | 'reviewing' | 'closed';
  participants: Map<string, Participant>;
  activities: Activity[];
  createdAt: Date;
};

// Legacy canvas types (kept for /canvas starter page)
export type User = { id: string; name: string; joinedAt: Date };
export type Note = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date;
};

export type AppState = {
  sessions: Map<string, Session>;
  users: Map<string, User>;
  notes: Note[];
};

const state: AppState = {
  sessions: new Map(),
  users: new Map(),
  notes: [],
};

export default state;
