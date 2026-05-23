import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import state from './store';

const buildServer = () => {
  const server = new McpServer({
    name: 'toil-tracker',
    version: '0.1.0',
  });

  // ── Tools ──────────────────────────────────────────────────────────────────

  server.tool(
    'get_status',
    'Returns the current status of the Toil Tracker server.',
    {},
    async () => ({
      content: [{ type: 'text', text: 'Toil Tracker MCP server is running.' }],
    })
  );

  server.tool(
    'create_session',
    'Creates a new toil audit session. Returns the session ID to share with participants.',
    { name: z.string().describe('Human-readable name for the session, e.g. "Q2 Toil Audit"') },
    async ({ name }) => {
      if (!name.trim()) {
        return { content: [{ type: 'text', text: 'Error: name is required' }] };
      }
      const session = {
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: new Date(),
        status: 'open' as const,
      };
      state.sessions.set(session.id, session);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ sessionId: session.id, name: session.name, status: session.status }),
        }],
      };
    }
  );

  server.tool(
    'get_session',
    'Returns details for a session including all participants and activities.',
    { sessionId: z.string().describe('The session ID') },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) {
        return { content: [{ type: 'text', text: 'Error: session not found' }] };
      }
      const participants = Array.from(state.participants.values()).filter(
        (p) => p.sessionId === sessionId
      );
      const activities = state.activities.filter((a) => a.sessionId === sessionId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ session, participants, activities }),
        }],
      };
    }
  );

  server.tool(
    'add_activity',
    'Adds a toil activity to a session on behalf of an engineer.',
    {
      sessionId: z.string().describe('The session ID'),
      authorName: z.string().describe('Name of the engineer submitting the activity'),
      description: z.string().describe('Description of the toil activity'),
      category: z.string().describe('Category, e.g. deployments, on-call, code review, incidents'),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'occasional']).describe('How often this occurs'),
      minutesPerOccurrence: z.number().int().positive().describe('Estimated minutes spent each time'),
      painLevel: z.number().int().min(1).max(5).describe('Pain level 1 (minor) to 5 (severe)'),
    },
    async ({ sessionId, authorName, description, category, frequency, minutesPerOccurrence, painLevel }) => {
      const session = state.sessions.get(sessionId);
      if (!session) {
        return { content: [{ type: 'text', text: 'Error: session not found' }] };
      }
      if (session.status === 'closed') {
        return { content: [{ type: 'text', text: 'Error: session is closed' }] };
      }
      const activity = {
        id: crypto.randomUUID(),
        sessionId,
        authorId: `mcp-${crypto.randomUUID()}`,
        authorName,
        description,
        category,
        frequency,
        minutesPerOccurrence,
        painLevel,
        flagged: false,
        createdAt: new Date(),
      };
      state.activities.push(activity);
      return {
        content: [{ type: 'text', text: JSON.stringify(activity) }],
      };
    }
  );

  server.tool(
    'list_activities',
    'Lists activities for a session. Optionally filter by author name or flag status.',
    {
      sessionId: z.string().describe('The session ID'),
      authorName: z.string().optional().describe('Filter by engineer name (case-insensitive partial match)'),
      flaggedOnly: z.boolean().optional().describe('If true, return only flagged activities'),
      sortBy: z.enum(['painLevel', 'minutesPerOccurrence', 'createdAt']).optional()
        .describe('Field to sort by (descending)'),
    },
    async ({ sessionId, authorName, flaggedOnly, sortBy }) => {
      const session = state.sessions.get(sessionId);
      if (!session) {
        return { content: [{ type: 'text', text: 'Error: session not found' }] };
      }
      let activities = state.activities.filter((a) => a.sessionId === sessionId);
      if (authorName) {
        const lower = authorName.toLowerCase();
        activities = activities.filter((a) => a.authorName.toLowerCase().includes(lower));
      }
      if (flaggedOnly) {
        activities = activities.filter((a) => a.flagged);
      }
      if (sortBy) {
        activities = [...activities].sort((a, b) => {
          const av = a[sortBy as keyof typeof a] as number | Date;
          const bv = b[sortBy as keyof typeof b] as number | Date;
          return av > bv ? -1 : av < bv ? 1 : 0;
        });
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: activities.length, activities }) }],
      };
    }
  );

  server.tool(
    'flag_activity',
    'Flags or unflags a toil activity to mark it as a priority action item.',
    {
      activityId: z.string().describe('The activity ID'),
      flagged: z.boolean().describe('True to flag, false to unflag'),
    },
    async ({ activityId, flagged }) => {
      const activity = state.activities.find((a) => a.id === activityId);
      if (!activity) {
        return { content: [{ type: 'text', text: 'Error: activity not found' }] };
      }
      activity.flagged = flagged;
      return {
        content: [{ type: 'text', text: JSON.stringify({ activityId, flagged: activity.flagged }) }],
      };
    }
  );

  server.tool(
    'close_session',
    'Closes a toil audit session so no more activities can be added.',
    { sessionId: z.string().describe('The session ID') },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) {
        return { content: [{ type: 'text', text: 'Error: session not found' }] };
      }
      session.status = 'closed';
      return {
        content: [{ type: 'text', text: JSON.stringify({ sessionId, status: session.status }) }],
      };
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
