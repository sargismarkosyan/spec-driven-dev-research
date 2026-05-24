import type { Energy, Freq, Role, SessionStatus, TeamAuto, Tpo } from './enums';

export type EditLogEntry = {
  who: string;
  what: string;
  at: string;
};

export type Participant = {
  id: string;
  name: string;
  role: Role;
  joinedAt: string;
  color: string;
  initials: string;
  isFacilitator: boolean;
};

export type Activity = {
  id: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  participantInitials: string;
  participantColor: string;
  title: string;
  tpo: Tpo;
  freq: Freq;
  energy: Energy;
  teamAuto: TeamAuto;
  flagged: boolean;
  discussionNote: string;
  createdAt: string;
  editedBy?: string;
  editHistory: EditLogEntry[];
  mergedFromIds?: string[];
  mergedFromNames?: string[];
  mergedFromInitials?: string[];
  mergedFromColors?: string[];
  reportedBy?: string[];
  reportedByInitials?: string[];
  reportedByColors?: string[];
  mergedIntoId?: string;
  isMergedSource?: boolean;
  relatedTo?: string[];
};

export type Session = {
  id: string;
  name: string;
  facilitatorId: string;
  facilitatorName: string;
  facilitatorToken: string;
  status: SessionStatus;
  submissionWindowMin: number;
  liveTeamFeed: boolean;
  recallPrompts: string[];
  enabledCategories: string[];
  createdAt: string;
  startedAt?: string;
  closedAt?: string;
  participants: Map<string, Participant>;
  activities: Map<string, Activity>;
};

export type CreateSessionInput = {
  name: string;
  facilitatorName?: string;
  submissionWindowMin?: number;
  liveTeamFeed?: boolean;
  recallPrompts?: string[];
  enabledCategories?: string[];
};

export type SerializedSession = Omit<Session, 'participants' | 'activities'> & {
  participants: Participant[];
  activities: Activity[];
};
