// In-memory store — Toil Tracker domain types

export type Session = {
  id: string;
  name: string;
  createdAt: Date;
  facilitatorToken: string;
  participants: Participant[];
  activities: Activity[];
  status: 'open' | 'reviewing' | 'closed';
};

export type Participant = {
  id: string;
  name: string;
  sessionId: string;
};

export type Activity = {
  id: string;
  participantId: string;
  title: string;
  timeEstimate: 'quick' | 'medium' | 'significant';
  enjoyment: 'yes' | 'meh' | 'no';
  repetitive: 'yes' | 'sometimes' | 'no';
  automatable: 'yes' | 'maybe' | 'no';
  flaggedByFacilitator: boolean;
};

export type AppState = {
  sessions: Map<string, Session>;
};

const state: AppState = {
  sessions: new Map(),
};

// Expire sessions older than 24 hours
setInterval(() => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  for (const [id, session] of state.sessions) {
    if (session.createdAt < cutoff) state.sessions.delete(id);
  }
}, 60 * 60 * 1000);

export default state;
