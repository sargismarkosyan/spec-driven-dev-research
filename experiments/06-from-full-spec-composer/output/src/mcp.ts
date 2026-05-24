import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { listSessions, getSession } from './store';
import { serializeSession } from '../lib/domain/serialization';
import { generateMcpExport } from '../lib/server/export';

const buildServer = () => {
  const server = new McpServer({
    name: 'work-audit',
    version: '1.0.0',
  });

  server.tool('list_sessions', 'List all active Work Audit sessions.', {}, async () => {
    const sessions = listSessions();
    const summary = sessions.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      participants: s.participants.size,
      activities: s.activities.size,
    }));
    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    };
  });

  server.tool(
    'get_session',
    'Get full state of a Work Audit session, including all activities.',
    { sessionId: z.string() },
    async ({ sessionId }) => {
      const session = getSession(sessionId);
      if (!session) {
        return { content: [{ type: 'text', text: 'Session not found.' }] };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(serializeSession(session), null, 2) }],
      };
    },
  );

  server.tool(
    'export_session_markdown',
    'Export a Work Audit session as a Markdown priority report.',
    { sessionId: z.string() },
    async ({ sessionId }) => {
      const session = getSession(sessionId);
      if (!session) {
        return { content: [{ type: 'text', text: 'Session not found.' }] };
      }
      return {
        content: [{ type: 'text', text: generateMcpExport(session) }],
      };
    },
  );

  server.tool(
    'list_activities',
    'List activities from a session, optionally filtered.',
    {
      sessionId: z.string(),
      filter: z.enum(['all', 'flagged', 'automatable', 'draining']).optional(),
    },
    async ({ sessionId, filter = 'all' }) => {
      const session = getSession(sessionId);
      if (!session) {
        return { content: [{ type: 'text', text: 'Session not found.' }] };
      }
      let activities = Array.from(session.activities.values());
      if (filter === 'flagged') activities = activities.filter((a) => a.flagged);
      if (filter === 'automatable') activities = activities.filter((a) => a.teamAuto === 'yes');
      if (filter === 'draining') activities = activities.filter((a) => a.energy === 'draining');

      return {
        content: [{ type: 'text', text: JSON.stringify(activities, null, 2) }],
      };
    },
  );

  return server;
};

export const setupMCP = (app: Express) => {
  app.post('/mcp', async (req: Request, res: Response) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });
};
