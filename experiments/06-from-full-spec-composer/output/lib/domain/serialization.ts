import { AVATAR_COLORS } from './constants';
import type { Activity, Participant, Session, SerializedSession } from './types';

export function serializeSession(session: Session): SerializedSession {
  return {
    ...session,
    participants: Array.from(session.participants.values()),
    activities: Array.from(session.activities.values()),
  };
}

export function getVisibleActivities(session: Session): Activity[] {
  return Array.from(session.activities.values()).filter((a) => !a.isMergedSource);
}

export function getTeamFeedActivities(
  session: Session,
  currentParticipantId: string,
): Activity[] {
  return getVisibleActivities(session)
    .filter((a) => a.participantId !== currentParticipantId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function findParticipantByName(
  session: Session,
  name: string,
): Participant | undefined {
  const normalized = name.trim().toLowerCase();
  for (const participant of session.participants.values()) {
    if (participant.name.trim().toLowerCase() === normalized) {
      return participant;
    }
  }
  return undefined;
}

export function getUsedColors(session: Session): Set<string> {
  return new Set(Array.from(session.participants.values()).map((p) => p.color));
}

export function assignParticipantColor(session: Session): string {
  const used = getUsedColors(session);
  for (const color of AVATAR_COLORS) {
    if (!used.has(color)) return color;
  }
  return AVATAR_COLORS[session.participants.size % AVATAR_COLORS.length];
}
