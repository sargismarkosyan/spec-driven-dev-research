import type { Server, Socket } from 'socket.io';
import { serializeSession } from '../../domain/serialization';
import type { Energy, Freq, Tpo } from '../../domain/enums';
import {
  addActivityToSession,
  classifyActivity,
  deleteActivity,
  flagActivity,
  mergeActivities,
  relateActivities,
  updateActivityFields,
  validateActivityDimensions,
} from '../activities';
import { verifyFacilitatorToken } from '../auth';
import {
  closeSession,
  completeSession,
  createParticipant,
  getSession,
  rebindParticipant,
  startSession,
} from '../../../src/store';
import {
  broadcastActivityAdded,
  broadcastActivityDeleted,
  broadcastActivityMerged,
  broadcastActivityUpdated,
  broadcastParticipantJoined,
  broadcastParticipantLeft,
  broadcastSessionExtended,
  broadcastSessionStatus,
  emitSessionState,
} from './broadcast';
import { resolveEngineerJoin } from './reconnection';

type SocketMeta = {
  sessionId?: string;
  participantId?: string;
};

const socketMeta = new Map<string, SocketMeta>();

function getMeta(socket: Socket): SocketMeta {
  let meta = socketMeta.get(socket.id);
  if (!meta) {
    meta = {};
    socketMeta.set(socket.id, meta);
  }
  return meta;
}

function emitError(socket: Socket, message: string) {
  socket.emit('error', message);
}

function extendWithSnapForward(session: ReturnType<typeof getSession>, addMinutes: number) {
  if (!session || !session.startedAt) return;
  const elapsedMin = (Date.now() - new Date(session.startedAt).getTime()) / 60000;
  if (session.submissionWindowMin > elapsedMin) {
    session.submissionWindowMin += addMinutes;
  } else {
    session.submissionWindowMin = Math.ceil(elapsedMin) + addMinutes;
  }
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('join-session', (payload: {
      sessionId: string;
      name: string;
      role?: string;
      isFacilitator?: boolean;
      token?: string;
    }) => {
      const { sessionId, name, role, isFacilitator, token } = payload ?? {};
      const session = getSession(sessionId);
      if (!session) {
        emitError(socket, 'session not found');
        return;
      }

      let participant;
      let oldSocketId: string | undefined;

      if (isFacilitator) {
        if (!verifyFacilitatorToken(session, token)) {
          emitError(socket, 'forbidden');
          return;
        }
        session.facilitatorId = socket.id;
        const existingFac = Array.from(session.participants.values()).find((p) => p.isFacilitator);
        if (existingFac) {
          oldSocketId = existingFac.id;
          participant = rebindParticipant(session, existingFac.id, socket.id);
        } else {
          participant = createParticipant(
            session,
            socket.id,
            name || 'Facilitator',
            'EM',
            true,
          );
        }
      } else {
        const resolution = resolveEngineerJoin(session, socket.id, name, role);
        participant = resolution.participant;
        oldSocketId = resolution.oldSocketId;
      }

      if (!participant) {
        emitError(socket, 'could not join session');
        return;
      }

      socket.join(sessionId);
      const meta = getMeta(socket);
      meta.sessionId = sessionId;
      meta.participantId = socket.id;

      if (oldSocketId && oldSocketId !== socket.id) {
        broadcastParticipantLeft(socket, sessionId, oldSocketId);
      }

      emitSessionState(socket, serializeSession(session));
      broadcastParticipantJoined(socket, sessionId, participant);
    });

    socket.on('activity:add', (payload: {
      sessionId: string;
      title: string;
      tpo: string;
      freq: string;
      energy: string;
    }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');
      if (session.status !== 'active') return emitError(socket, 'session is not active');
      if (!validateActivityDimensions(payload.tpo, payload.freq, payload.energy)) {
        return emitError(socket, 'invalid activity');
      }

      const activity = addActivityToSession(session, socket.id, {
        title: payload.title,
        tpo: payload.tpo as Tpo,
        freq: payload.freq as Freq,
        energy: payload.energy as Energy,
      });
      if (!activity) return emitError(socket, 'could not add activity');
      broadcastActivityAdded(io, session.id, activity);
    });

    socket.on('activity:update', (payload: {
      sessionId: string;
      activityId: string;
      title?: string;
      tpo?: string;
      freq?: string;
      energy?: string;
      token?: string;
    }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');

      const activity = session.activities.get(payload.activityId);
      if (!activity) return emitError(socket, 'activity not found');

      const isFacilitator = verifyFacilitatorToken(session, payload.token);
      if (!isFacilitator && activity.participantId !== socket.id) {
        return emitError(socket, 'edit blocked: not your activity');
      }
      if (!isFacilitator && session.status !== 'active') {
        return emitError(socket, 'session is not active');
      }

      const who = isFacilitator
        ? session.facilitatorName || 'Facilitator'
        : session.participants.get(socket.id)?.name ?? 'Engineer';

      const updated = updateActivityFields(
        session,
        payload.activityId,
        {
          title: payload.title,
          tpo: payload.tpo as Tpo | undefined,
          freq: payload.freq as Freq | undefined,
          energy: payload.energy as Energy | undefined,
        },
        who,
        'updated',
        isFacilitator && activity.participantId !== socket.id ? who : undefined,
      );
      if (updated) broadcastActivityUpdated(io, session.id, updated);
    });

    socket.on('activity:delete', (payload: {
      sessionId: string;
      activityId: string;
      token?: string;
    }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');

      const activity = session.activities.get(payload.activityId);
      if (!activity) return emitError(socket, 'activity not found');

      const isFacilitator = verifyFacilitatorToken(session, payload.token);
      if (!isFacilitator && activity.participantId !== socket.id) {
        return emitError(socket, 'delete blocked: not your activity');
      }
      if (!isFacilitator && session.status !== 'active') {
        return emitError(socket, 'session is not active');
      }

      deleteActivity(session, payload.activityId);
      broadcastActivityDeleted(io, session.id, payload.activityId);
    });

    socket.on('session:start', (payload: { sessionId: string; token: string }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');
      if (!verifyFacilitatorToken(session, payload.token)) return emitError(socket, 'forbidden');
      try {
        startSession(session);
      } catch {
        return emitError(socket, 'invalid status transition');
      }
      broadcastSessionStatus(io, session.id, {
        status: 'active',
        startedAt: session.startedAt,
      });
    });

    socket.on('session:extend', (payload: { sessionId: string; token: string; addMinutes?: number }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');
      if (!verifyFacilitatorToken(session, payload.token)) return emitError(socket, 'forbidden');
      extendWithSnapForward(session, payload.addMinutes ?? 2);
      broadcastSessionExtended(io, session.id, {
        submissionWindowMin: session.submissionWindowMin,
      });
    });

    socket.on('session:close', (payload: { sessionId: string; token: string }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');
      if (!verifyFacilitatorToken(session, payload.token)) return emitError(socket, 'forbidden');
      try {
        closeSession(session);
      } catch {
        return emitError(socket, 'invalid status transition');
      }
      broadcastSessionStatus(io, session.id, { status: 'discussion' });
    });

    socket.on('session:complete', (payload: { sessionId: string; token: string }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');
      if (!verifyFacilitatorToken(session, payload.token)) return emitError(socket, 'forbidden');
      try {
        completeSession(session);
      } catch {
        return emitError(socket, 'invalid status transition');
      }
      broadcastSessionStatus(io, session.id, { status: 'done' });
    });

    socket.on('activity:classify', (payload: {
      sessionId: string;
      activityId: string;
      verdict: string;
      token: string;
    }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');
      if (!verifyFacilitatorToken(session, payload.token)) return emitError(socket, 'forbidden');

      const updated = classifyActivity(
        session,
        payload.activityId,
        payload.verdict as 'yes' | 'maybe' | 'no',
        session.facilitatorName || 'Facilitator',
        'socket',
      );
      if (updated) broadcastActivityUpdated(io, session.id, updated);
    });

    socket.on('activity:flag', (payload: {
      sessionId: string;
      activityId: string;
      token: string;
      flagged?: boolean;
      note?: string;
    }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');
      if (!verifyFacilitatorToken(session, payload.token)) return emitError(socket, 'forbidden');

      const activity = session.activities.get(payload.activityId);
      if (!activity) return emitError(socket, 'activity not found');

      const newFlagged = payload.flagged !== undefined ? payload.flagged : !activity.flagged;
      const updated = flagActivity(
        session,
        payload.activityId,
        newFlagged,
        payload.note,
        session.facilitatorName || 'Facilitator',
      );
      if (updated) broadcastActivityUpdated(io, session.id, updated);
    });

    socket.on('activity:note', (payload: {
      sessionId: string;
      activityId: string;
      token: string;
      note: string;
    }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');
      if (!verifyFacilitatorToken(session, payload.token)) return emitError(socket, 'forbidden');

      const updated = updateActivityFields(
        session,
        payload.activityId,
        { discussionNote: payload.note ?? '' },
        session.facilitatorName || 'Facilitator',
        'note updated',
        undefined,
        true,
      );
      if (updated) broadcastActivityUpdated(io, session.id, updated);
    });

    socket.on('activity:merge', (payload: {
      sessionId: string;
      token: string;
      sourceIds: string[];
      title?: string;
      tpo: string;
      freq: string;
      energy: string;
    }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');
      if (!verifyFacilitatorToken(session, payload.token)) return emitError(socket, 'forbidden');
      if (!validateActivityDimensions(payload.tpo, payload.freq, payload.energy)) {
        return emitError(socket, 'invalid dimensions');
      }

      const result = mergeActivities(session, payload.sourceIds, {
        title: payload.title,
        tpo: payload.tpo as Tpo,
        freq: payload.freq as Freq,
        energy: payload.energy as Energy,
      });
      if (result) broadcastActivityMerged(io, session.id, result);
      else emitError(socket, 'merge failed');
    });

    socket.on('activity:relate', (payload: {
      sessionId: string;
      token: string;
      idA?: string;
      idB?: string;
      activityId?: string;
      relatedId?: string;
    }) => {
      const session = getSession(payload?.sessionId);
      if (!session) return emitError(socket, 'session not found');
      if (!verifyFacilitatorToken(session, payload.token)) return emitError(socket, 'forbidden');

      const activityId = payload.idA ?? payload.activityId;
      const relatedId = payload.idB ?? payload.relatedId;
      if (!activityId || !relatedId) {
        return emitError(socket, 'activity ids required');
      }

      const result = relateActivities(session, activityId, relatedId);
      if (result) {
        broadcastActivityUpdated(io, session.id, result.a);
        broadcastActivityUpdated(io, session.id, result.b);
      }
    });

    socket.on('disconnect', () => {
      const meta = socketMeta.get(socket.id);
      if (meta?.sessionId) {
        const session = getSession(meta.sessionId);
        if (session) {
          session.participants.delete(socket.id);
        }
        broadcastParticipantLeft(socket, meta.sessionId, socket.id);
      }
      socketMeta.delete(socket.id);
    });
  });
}
