import type { Role } from '../../domain/enums';
import { isValidRole } from '../../domain/enums';
import type { Activity, Participant, Session } from '../../domain/types';
import {
  createParticipant,
  rebindParticipant,
  retargetActivitiesByName,
} from '../../../src/store';

// Participant name lookup is CASE-SENSITIVE per spec (reconnection.md, client-to-server.md).

export function findParticipantByNameCaseSensitive(
  session: Session,
  name: string,
): Participant | undefined {
  const trimmed = name.trim();
  for (const participant of session.participants.values()) {
    if (participant.name.trim() === trimmed) {
      return participant;
    }
  }
  return undefined;
}

function findOrphanActivityByName(session: Session, name: string): Activity | undefined {
  const trimmed = name.trim();
  return Array.from(session.activities.values()).find(
    (a) => a.participantName.trim() === trimmed,
  );
}

export type JoinResolution = {
  participant: Participant;
  oldSocketId?: string;
};

export function resolveEngineerJoin(
  session: Session,
  socketId: string,
  name: string,
  role?: string,
): JoinResolution {
  const existing = findParticipantByNameCaseSensitive(session, name);
  if (existing) {
    const oldSocketId = existing.id;
    const participant = rebindParticipant(session, existing.id, socketId)!;
    retargetActivitiesByName(session, name, socketId);
    return { participant, oldSocketId };
  }

  const orphanActivity = findOrphanActivityByName(session, name);
  const validRole: Role = role && isValidRole(role) ? role : 'IC';
  const participant = createParticipant(session, socketId, name, validRole, false);
  if (orphanActivity) {
    participant.color = orphanActivity.participantColor;
    participant.initials = orphanActivity.participantInitials;
    retargetActivitiesByName(session, name, socketId);
  }
  return { participant };
}
