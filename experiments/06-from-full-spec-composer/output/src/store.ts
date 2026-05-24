import type { Role } from '../lib/domain/enums';
import {
  ALL_CATEGORY_IDS,
  AVATAR_COLORS,
  SESSION_ID_CHARS,
  SESSION_ID_LENGTH,
} from '../lib/domain/constants';
import { deriveInitials } from '../lib/domain/calculations';
import { assignParticipantColor } from '../lib/domain/serialization';
import type {
  Activity,
  CreateSessionInput,
  EditLogEntry,
  Participant,
  Session,
} from '../lib/domain/types';

export type AppState = {
  sessions: Map<string, Session>;
};

const state: AppState = {
  sessions: new Map(),
};

export default state;

export function generateSessionId(): string {
  let id: string;
  do {
    id = Array.from({ length: SESSION_ID_LENGTH }, () =>
      SESSION_ID_CHARS[Math.floor(Math.random() * SESSION_ID_CHARS.length)],
    ).join('');
  } while (state.sessions.has(id));
  return id;
}

export function generateFacilitatorToken(): string {
  return crypto.randomUUID();
}

export function generateActivityId(): string {
  return crypto.randomUUID();
}

export function generateMergedActivityId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function getSession(id: string): Session | undefined {
  return state.sessions.get(id);
}

export function createSession(input: CreateSessionInput): Session {
  const enabledCategories =
    input.enabledCategories !== undefined ? input.enabledCategories : [...ALL_CATEGORY_IDS];

  const session: Session = {
    id: generateSessionId(),
    name: input.name,
    facilitatorId: '',
    facilitatorName: input.facilitatorName?.trim() ?? '',
    facilitatorToken: generateFacilitatorToken(),
    status: 'lobby',
    submissionWindowMin: input.submissionWindowMin ?? 10,
    liveTeamFeed: input.liveTeamFeed ?? true,
    recallPrompts: input.recallPrompts ?? [],
    enabledCategories,
    createdAt: new Date().toISOString(),
    participants: new Map(),
    activities: new Map(),
  };

  state.sessions.set(session.id, session);
  return session;
}

export function listSessions(): Session[] {
  return Array.from(state.sessions.values());
}

const STATUS_ORDER = ['lobby', 'active', 'discussion', 'done'] as const;

export function canTransitionStatus(
  current: Session['status'],
  next: Session['status'],
): boolean {
  const currentIdx = STATUS_ORDER.indexOf(current);
  const nextIdx = STATUS_ORDER.indexOf(next);
  return nextIdx === currentIdx + 1;
}

export function startSession(session: Session): void {
  if (!canTransitionStatus(session.status, 'active')) {
    throw new Error('invalid status transition');
  }
  session.status = 'active';
  session.startedAt = new Date().toISOString();
}

export function closeSession(session: Session): void {
  if (!canTransitionStatus(session.status, 'discussion')) {
    throw new Error('invalid status transition');
  }
  session.status = 'discussion';
  session.closedAt = new Date().toISOString();
}

export function completeSession(session: Session): void {
  if (!canTransitionStatus(session.status, 'done')) {
    throw new Error('invalid status transition');
  }
  session.status = 'done';
}

export function updateSessionSettings(
  session: Session,
  updates: {
    submissionWindowMin?: number;
    liveTeamFeed?: boolean;
    enabledCategories?: string[];
    recallPrompts?: string[];
  },
): void {
  if (session.status !== 'lobby') {
    throw new Error('settings can only be updated in lobby');
  }
  if (updates.submissionWindowMin !== undefined) {
    if (updates.submissionWindowMin < 0 || !Number.isInteger(updates.submissionWindowMin)) {
      throw new Error('invalid submission window');
    }
    session.submissionWindowMin = updates.submissionWindowMin;
  }
  if (updates.liveTeamFeed !== undefined) {
    session.liveTeamFeed = updates.liveTeamFeed;
  }
  if (updates.enabledCategories !== undefined) {
    if (!Array.isArray(updates.enabledCategories) || updates.enabledCategories.length === 0) {
      throw new Error('enabledCategories must contain at least one category');
    }
    session.enabledCategories = updates.enabledCategories;
  }
  if (updates.recallPrompts !== undefined) {
    session.recallPrompts = updates.recallPrompts;
  }
}

export function extendSession(session: Session, additionalMinutes: number): void {
  session.submissionWindowMin += additionalMinutes;
}

export function createParticipant(
  session: Session,
  id: string,
  name: string,
  role: Role,
  isFacilitator: boolean,
): Participant {
  const color = assignParticipantColor(session);
  const participant: Participant = {
    id,
    name: name.trim(),
    role,
    joinedAt: new Date().toISOString(),
    color,
    initials: deriveInitials(name),
    isFacilitator,
  };
  session.participants.set(id, participant);
  return participant;
}

export function rebindParticipant(
  session: Session,
  oldId: string,
  newId: string,
): Participant | undefined {
  const participant = session.participants.get(oldId);
  if (!participant) return undefined;
  session.participants.delete(oldId);
  participant.id = newId;
  session.participants.set(newId, participant);
  return participant;
}

export function retargetActivitiesByName(
  session: Session,
  participantName: string,
  newParticipantId: string,
): void {
  const trimmed = participantName.trim();
  for (const activity of session.activities.values()) {
    if (activity.participantName.trim() === trimmed) {
      activity.participantId = newParticipantId;
    }
  }
}

export type CreateActivityInput = {
  sessionId: string;
  participantId: string;
  participantName: string;
  participantInitials: string;
  participantColor: string;
  title: string;
  tpo: Activity['tpo'];
  freq: Activity['freq'];
  energy: Activity['energy'];
};

export function createActivity(input: CreateActivityInput): Activity {
  const now = new Date().toISOString();
  const entry: EditLogEntry = { who: input.participantName, what: 'created', at: now };
  const activity: Activity = {
    id: generateActivityId(),
    sessionId: input.sessionId,
    participantId: input.participantId,
    participantName: input.participantName,
    participantInitials: input.participantInitials,
    participantColor: input.participantColor,
    title: input.title.trim(),
    tpo: input.tpo,
    freq: input.freq,
    energy: input.energy,
    teamAuto: 'unclassified',
    flagged: false,
    discussionNote: '',
    createdAt: now,
    editHistory: [entry],
    relatedTo: [],
  };
  const session = getSession(input.sessionId);
  if (session) {
    session.activities.set(activity.id, activity);
  }
  return activity;
}

export function deleteActivity(session: Session, activityId: string): boolean {
  return session.activities.delete(activityId);
}

export { AVATAR_COLORS };
