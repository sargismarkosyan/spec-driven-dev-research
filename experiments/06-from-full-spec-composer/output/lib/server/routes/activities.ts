import type { Express, Request, Response } from 'express';
import type { Server as SocketServer } from 'socket.io';
import { getSession } from '../../../src/store';
import { generateRestExport } from '../export';
import {
  addActivityToSession,
  classifyActivity,
  deleteActivity,
  flagActivity,
  getActivity,
  getMergeCandidatesForApi,
  isValidTeamAuto,
  mergeActivities,
  relateActivities,
  updateActivityFields,
  validateActivityDimensions,
} from '../activities';
import { canEditActivity, getToken, requireFacilitator, verifyFacilitatorToken } from '../auth';
import { sendError, sendOk } from '../errors';
import type { Energy, Freq, Tpo } from '../../domain/enums';
import {
  broadcastActivityAdded,
  broadcastActivityDeleted,
  broadcastActivityMerged,
  broadcastActivityUpdated,
} from '../socket/broadcast';

export function registerActivityRoutes(app: Express, io: SocketServer) {
  app.post('/api/sessions/:id/activities', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);

    const { participantId, title, tpo, freq, energy } = req.body ?? {};
    const token = getToken(req);
    const isFacilitator = verifyFacilitatorToken(session, token);

    if (!title) {
      return sendError(res, 'participantId and title are required', 400);
    }
    if (session.status !== 'active') {
      return sendError(res, 'session is not active', 400);
    }
    if (!validateActivityDimensions(tpo, freq, energy)) {
      return sendError(res, 'invalid activity dimensions', 400);
    }

    let ownerId = participantId as string | undefined;
    if (isFacilitator) {
      const facilitator = Array.from(session.participants.values()).find((p) => p.isFacilitator);
      if (!facilitator) return sendError(res, 'facilitator not joined', 400);
      ownerId = facilitator.id;
    } else if (!ownerId) {
      return sendError(res, 'participantId and title are required', 400);
    }

    const activity = addActivityToSession(
      session,
      ownerId,
      {
        title,
        tpo: tpo as Tpo,
        freq: freq as Freq,
        energy: energy as Energy,
      },
      { allowFacilitator: isFacilitator },
    );
    if (!activity) return sendError(res, 'could not create activity', 400);

    broadcastActivityAdded(io, session.id, activity);
    return res.json(activity);
  });

  app.put('/api/sessions/:id/activities/:aid', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);

    const activity = getActivity(session, req.params.aid);
    if (!activity) return sendError(res, 'not found', 404);

    const token = getToken(req);
    const { participantId, title, tpo, freq, energy } = req.body ?? {};

    if (!canEditActivity(session, activity.participantId, token, participantId)) {
      return sendError(res, 'forbidden', 403);
    }

    const isFacilitator = verifyFacilitatorToken(session, token);
    if (!isFacilitator && session.status !== 'active') {
      return sendError(res, 'session is not active', 400);
    }

    const who = isFacilitator
      ? session.facilitatorName || 'Facilitator'
      : session.participants.get(participantId)?.name ?? 'Engineer';

    const updated = updateActivityFields(
      session,
      req.params.aid,
      { title, tpo, freq, energy },
      who,
      'updated',
      isFacilitator && activity.participantId !== participantId ? who : undefined,
    );
    if (!updated) return sendError(res, 'not found', 404);

    broadcastActivityUpdated(io, session.id, updated);
    return res.json(updated);
  });

  app.delete('/api/sessions/:id/activities/:aid', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);

    const activity = getActivity(session, req.params.aid);
    if (!activity) return sendError(res, 'not found', 404);

    const token = getToken(req);
    const { participantId } = req.body ?? {};

    if (!canEditActivity(session, activity.participantId, token, participantId)) {
      return sendError(res, 'forbidden', 403);
    }

    const isFacilitator = verifyFacilitatorToken(session, token);
    if (!isFacilitator && session.status !== 'active') {
      return sendError(res, 'session is not active', 400);
    }

    deleteActivity(session, req.params.aid);
    broadcastActivityDeleted(io, session.id, req.params.aid);
    return sendOk(res);
  });

  app.post('/api/sessions/:id/activities/:aid/classify', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);

    const err = requireFacilitator(session, getToken(req));
    if (err) return sendError(res, err, 403);

    const { verdict } = req.body ?? {};
    if (!isValidTeamAuto(verdict) || verdict === 'unclassified') {
      return sendError(res, 'invalid verdict', 400);
    }

    const updated = classifyActivity(
      session,
      req.params.aid,
      verdict,
      session.facilitatorName || 'Facilitator',
    );
    if (!updated) return sendError(res, 'not found', 404);

    broadcastActivityUpdated(io, session.id, updated);
    return res.json(updated);
  });

  app.post('/api/sessions/:id/activities/:aid/flag', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);

    const err = requireFacilitator(session, getToken(req));
    if (err) return sendError(res, err, 403);

    const activity = getActivity(session, req.params.aid);
    if (!activity) return sendError(res, 'not found', 404);

    const { flagged, note } = req.body ?? {};
    const newFlagged = flagged !== undefined ? !!flagged : !activity.flagged;

    const updated = flagActivity(
      session,
      req.params.aid,
      newFlagged,
      note,
      session.facilitatorName || 'Facilitator',
    );
    if (!updated) return sendError(res, 'not found', 404);

    broadcastActivityUpdated(io, session.id, updated);
    return res.json(updated);
  });

  app.post('/api/sessions/:id/activities/:aid/note', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);

    const err = requireFacilitator(session, getToken(req));
    if (err) return sendError(res, err, 403);

    const { note } = req.body ?? {};
    const updated = updateActivityFields(
      session,
      req.params.aid,
      { discussionNote: note ?? '' },
      session.facilitatorName || 'Facilitator',
      'note updated',
      undefined,
      true,
    );
    if (!updated) return sendError(res, 'not found', 404);

    broadcastActivityUpdated(io, session.id, updated);
    return res.json(updated);
  });

  app.get('/api/sessions/:id/activities/:aid/merge-candidates', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);

    const candidates = getMergeCandidatesForApi(session, req.params.aid);
    if (candidates === null) return sendError(res, 'not found', 404);

    return res.json(candidates);
  });

  app.post('/api/sessions/:id/activities/merge', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);

    const err = requireFacilitator(session, getToken(req));
    if (err) return sendError(res, err, 403);

    const { sourceIds, title, tpo, freq, energy } = req.body ?? {};
    if (!Array.isArray(sourceIds) || sourceIds.length < 2) {
      return sendError(res, 'at least 2 source activities required', 400);
    }
    if (!validateActivityDimensions(tpo, freq, energy)) {
      return sendError(res, 'invalid activity dimensions', 400);
    }

    const result = mergeActivities(session, sourceIds, {
      title,
      tpo: tpo as Tpo,
      freq: freq as Freq,
      energy: energy as Energy,
    });
    if (!result) return sendError(res, 'not found', 400);

    broadcastActivityMerged(io, session.id, result);
    return res.json(result);
  });

  app.post('/api/sessions/:id/activities/relate', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);

    const err = requireFacilitator(session, getToken(req));
    if (err) return sendError(res, err, 403);

    const { activityId, relatedId } = req.body ?? {};
    if (!activityId || !relatedId) {
      return sendError(res, 'activityId and relatedId are required', 400);
    }

    const result = relateActivities(session, activityId, relatedId);
    if (!result) return sendError(res, 'not found', 404);

    broadcastActivityUpdated(io, session.id, result.a);
    broadcastActivityUpdated(io, session.id, result.b);
    return res.json(result);
  });

  app.get('/api/sessions/:id/export', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);
    return res.json(generateRestExport(session));
  });
}
