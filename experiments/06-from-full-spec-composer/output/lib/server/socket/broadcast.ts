import type { Server as SocketServer, Socket } from 'socket.io';
import type { Activity, Participant, SerializedSession } from '../../domain/types';

export function broadcastActivityAdded(
  io: SocketServer,
  sessionId: string,
  activity: Activity,
): void {
  io.to(sessionId).emit('activity:added', activity);
}

export function broadcastActivityUpdated(
  io: SocketServer,
  sessionId: string,
  activity: Activity,
): void {
  io.to(sessionId).emit('activity:updated', activity);
}

export function broadcastActivityDeleted(
  io: SocketServer,
  sessionId: string,
  activityId: string,
): void {
  io.to(sessionId).emit('activity:deleted', { id: activityId });
}

export function broadcastActivityMerged(
  io: SocketServer,
  sessionId: string,
  result: { newActivity: Activity; updatedSources: Activity[] },
): void {
  io.to(sessionId).emit('activity:merged', result);
}

export function broadcastSessionStatus(
  io: SocketServer,
  sessionId: string,
  payload: { status: string; startedAt?: string },
): void {
  io.to(sessionId).emit('session:status', payload);
}

export function broadcastSessionExtended(
  io: SocketServer,
  sessionId: string,
  payload: { submissionWindowMin: number },
): void {
  io.to(sessionId).emit('session:extended', payload);
}

export function broadcastSessionSettings(
  io: SocketServer,
  sessionId: string,
  payload: {
    submissionWindowMin: number;
    liveTeamFeed: boolean;
    enabledCategories: string[];
    recallPrompts: string[];
  },
): void {
  io.to(sessionId).emit('session:settings', payload);
}

export function broadcastParticipantJoined(
  socket: Socket,
  sessionId: string,
  participant: Participant,
): void {
  socket.to(sessionId).emit('participant:joined', participant);
}

export function broadcastParticipantLeft(
  socket: Socket,
  sessionId: string,
  participantId: string,
): void {
  socket.to(sessionId).emit('participant:left', { id: participantId });
}

export function emitSessionState(socket: Socket, session: SerializedSession): void {
  socket.emit('session:state', session);
}
