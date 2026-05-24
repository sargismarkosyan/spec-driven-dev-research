import type { Request } from 'express';
import type { Session } from '../domain/types';

export function apiError(message: string, status: number) {
  return { error: message, status };
}

export function getToken(req: Request): string | undefined {
  const body = req.body as { token?: string };
  if (body?.token) return body.token;
  const query = req.query as { token?: string };
  return query.token;
}

export function verifyFacilitatorToken(session: Session, token?: string): boolean {
  return !!token && token === session.facilitatorToken;
}

export function verifyActivityOwner(
  activityParticipantId: string,
  participantId?: string,
): boolean {
  return !!participantId && participantId === activityParticipantId;
}

export function canEditActivity(
  session: Session,
  activityParticipantId: string,
  token?: string,
  participantId?: string,
): boolean {
  if (verifyFacilitatorToken(session, token)) return true;
  return verifyActivityOwner(activityParticipantId, participantId);
}

export function requireFacilitator(session: Session, token?: string): string | null {
  if (!verifyFacilitatorToken(session, token)) return 'forbidden';
  return null;
}

export function getParticipant(session: Session, participantId: string) {
  return session.participants.get(participantId);
}
