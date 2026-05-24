import type { Express, Request, Response } from 'express';
import type { Server as SocketServer } from 'socket.io';
import {
  closeSession,
  completeSession,
  createSession,
  extendSession,
  getSession,
  startSession,
  updateSessionSettings,
} from '../../../src/store';
import { serializeSession } from '../../domain/serialization';
import { getToken, requireFacilitator } from '../auth';
import { sendError, sendOk } from '../errors';
import { broadcastSessionExtended, broadcastSessionSettings, broadcastSessionStatus } from '../socket/broadcast';

export function registerSessionRoutes(app: Express, io: SocketServer) {
  app.post('/api/sessions', (req: Request, res: Response) => {
    const { name, facilitatorName, submissionWindowMin, liveTeamFeed, recallPrompts, enabledCategories } =
      req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(res, 'name is required', 400);
    }
    const session = createSession({
      name: name.trim(),
      facilitatorName,
      submissionWindowMin,
      liveTeamFeed,
      recallPrompts,
      enabledCategories,
    });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return res.json({
      id: session.id,
      token: session.facilitatorToken,
      url: `${baseUrl}/session/${session.id}`,
    });
  });

  app.get('/api/sessions/:id', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);
    return res.json(serializeSession(session));
  });

  app.patch('/api/sessions/:id/settings', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);
    const err = requireFacilitator(session, getToken(req));
    if (err) return sendError(res, err, 403);

    const { submissionWindowMin, liveTeamFeed, enabledCategories, recallPrompts } = req.body ?? {};
    try {
      updateSessionSettings(session, {
        submissionWindowMin,
        liveTeamFeed,
        enabledCategories,
        recallPrompts,
      });
    } catch (e) {
      return sendError(res, e instanceof Error ? e.message : 'invalid settings', 400);
    }

    broadcastSessionSettings(io, session.id, {
      submissionWindowMin: session.submissionWindowMin,
      liveTeamFeed: session.liveTeamFeed,
      enabledCategories: session.enabledCategories,
      recallPrompts: session.recallPrompts,
    });
    return res.json(serializeSession(session));
  });

  app.post('/api/sessions/:id/start', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);
    const err = requireFacilitator(session, getToken(req));
    if (err) return sendError(res, err, 403);
    try {
      startSession(session);
    } catch {
      return sendError(res, 'invalid status transition', 400);
    }
    broadcastSessionStatus(io, session.id, {
      status: 'active',
      startedAt: session.startedAt,
    });
    return sendOk(res);
  });

  app.post('/api/sessions/:id/extend', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);
    const err = requireFacilitator(session, getToken(req));
    if (err) return sendError(res, err, 403);
    const addMinutes = req.body?.addMinutes ?? 2;
    extendSession(session, addMinutes);
    broadcastSessionExtended(io, session.id, {
      submissionWindowMin: session.submissionWindowMin,
    });
    return sendOk(res);
  });

  app.post('/api/sessions/:id/close', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);
    const err = requireFacilitator(session, getToken(req));
    if (err) return sendError(res, err, 403);
    try {
      closeSession(session);
    } catch {
      return sendError(res, 'invalid status transition', 400);
    }
    broadcastSessionStatus(io, session.id, { status: 'discussion' });
    return sendOk(res);
  });

  app.post('/api/sessions/:id/complete', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) return sendError(res, 'session not found', 404);
    const err = requireFacilitator(session, getToken(req));
    if (err) return sendError(res, err, 403);
    try {
      completeSession(session);
    } catch {
      return sendError(res, 'invalid status transition', 400);
    }
    broadcastSessionStatus(io, session.id, { status: 'done' });
    return sendOk(res);
  });
}
