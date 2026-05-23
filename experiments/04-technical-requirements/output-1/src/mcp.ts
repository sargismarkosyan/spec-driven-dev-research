import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { Server } from 'socket.io';
import state from './store';
import type { Activity, Participant } from './store';

let _io: Server | null = null;

export function setIO(io: Server) {
  _io = io;
}

const buildServer = () => {
  const server = new McpServer({
    name: 'toil-tracker',
    version: '1.0.0',
  });

  server.tool(
    'create_session',
    'Create a new toil-tracker session. Returns sessionId and facilitatorToken.',
    { name: z.string().describe('Human-readable session name') },
    async ({ name }) => {
      const id = crypto.randomUUID();
      const facilitatorToken = crypto.randomUUID();
      state.sessions.set(id, {
        id,
        name,
        createdAt: new Date(),
        facilitatorToken,
        participants: [],
        activities: [],
        status: 'open',
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify({ sessionId: id, facilitatorToken }) }] };
    }
  );

  server.tool(
    'get_session',
    'Fetch full session state by sessionId.',
    { sessionId: z.string() },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(session) }] };
    }
  );

  server.tool(
    'join_session',
    'Join a session as a named participant. Returns participantId.',
    { sessionId: z.string(), name: z.string().describe('Participant display name') },
    async ({ sessionId, name }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }], isError: true };

      const participant: Participant = { id: crypto.randomUUID(), name, sessionId };
      session.participants.push(participant);
      _io?.to(`session:${sessionId}`).emit('participant:joined', participant);

      return { content: [{ type: 'text' as const, text: JSON.stringify({ participantId: participant.id }) }] };
    }
  );

  server.tool(
    'add_activity',
    'Add an activity with all four tag fields to a session.',
    {
      sessionId: z.string(),
      participantId: z.string(),
      title: z.string(),
      timeEstimate: z.enum(['quick', 'medium', 'significant']),
      enjoyment: z.enum(['yes', 'meh', 'no']),
      repetitive: z.enum(['yes', 'sometimes', 'no']),
      automatable: z.enum(['yes', 'maybe', 'no']),
    },
    async ({ sessionId, participantId, title, timeEstimate, enjoyment, repetitive, automatable }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }], isError: true };
      if (session.status !== 'open') return { content: [{ type: 'text' as const, text: 'Session is not open' }], isError: true };

      const activity: Activity = {
        id: crypto.randomUUID(),
        participantId,
        title,
        timeEstimate,
        enjoyment,
        repetitive,
        automatable,
        flaggedByFacilitator: false,
      };
      session.activities.push(activity);
      _io?.to(`session:${sessionId}`).emit('activity:added', activity);

      return { content: [{ type: 'text' as const, text: JSON.stringify(activity) }] };
    }
  );

  server.tool(
    'update_activity',
    'Edit an existing activity by activityId. The participant must own the activity.',
    {
      sessionId: z.string(),
      activityId: z.string(),
      participantId: z.string(),
      title: z.string().optional(),
      timeEstimate: z.enum(['quick', 'medium', 'significant']).optional(),
      enjoyment: z.enum(['yes', 'meh', 'no']).optional(),
      repetitive: z.enum(['yes', 'sometimes', 'no']).optional(),
      automatable: z.enum(['yes', 'maybe', 'no']).optional(),
    },
    async ({ sessionId, activityId, participantId, ...updates }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }], isError: true };

      const activity = session.activities.find(a => a.id === activityId && a.participantId === participantId);
      if (!activity) return { content: [{ type: 'text' as const, text: 'Activity not found or not owned by participant' }], isError: true };

      const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      Object.assign(activity, clean);
      _io?.to(`session:${sessionId}`).emit('activity:updated', activity);

      return { content: [{ type: 'text' as const, text: JSON.stringify(activity) }] };
    }
  );

  server.tool(
    'list_activities',
    'List all activities in a session, optionally filtered by automatable value.',
    {
      sessionId: z.string(),
      automatable: z.enum(['yes', 'maybe', 'no']).optional(),
    },
    async ({ sessionId, automatable }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }], isError: true };

      const activities = automatable
        ? session.activities.filter(a => a.automatable === automatable)
        : session.activities;

      return { content: [{ type: 'text' as const, text: JSON.stringify(activities) }] };
    }
  );

  server.tool(
    'flag_activity',
    'Facilitator-only: toggle the flagged state of an activity.',
    {
      sessionId: z.string(),
      facilitatorToken: z.string(),
      activityId: z.string(),
    },
    async ({ sessionId, facilitatorToken, activityId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }], isError: true };
      if (session.facilitatorToken !== facilitatorToken) return { content: [{ type: 'text' as const, text: 'Invalid facilitator token' }], isError: true };

      const activity = session.activities.find(a => a.id === activityId);
      if (!activity) return { content: [{ type: 'text' as const, text: 'Activity not found' }], isError: true };

      activity.flaggedByFacilitator = !activity.flaggedByFacilitator;
      _io?.to(`session:${sessionId}`).emit('activity:flagged', { activityId, flagged: activity.flaggedByFacilitator });

      return { content: [{ type: 'text' as const, text: JSON.stringify({ activityId, flagged: activity.flaggedByFacilitator }) }] };
    }
  );

  server.tool(
    'close_session',
    'Facilitator-only: transition session status (open → reviewing → closed).',
    {
      sessionId: z.string(),
      facilitatorToken: z.string(),
      status: z.enum(['open', 'reviewing', 'closed']),
    },
    async ({ sessionId, facilitatorToken, status }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }], isError: true };
      if (session.facilitatorToken !== facilitatorToken) return { content: [{ type: 'text' as const, text: 'Invalid facilitator token' }], isError: true };

      session.status = status;
      _io?.to(`session:${sessionId}`).emit('session:statusChanged', status);

      return { content: [{ type: 'text' as const, text: JSON.stringify({ sessionId, status }) }] };
    }
  );

  server.tool(
    'export_session',
    'Return all session data as structured JSON.',
    { sessionId: z.string() },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(session, null, 2) }] };
    }
  );

  return server;
};

export const setupMCP = (app: Express) => {
  app.post('/mcp', async (req: Request, res: Response) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });
};
