import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import state from './store';

function automationScore(a: { automatable: string; repetitive: string; duration: string }) {
  const auto = ({ yes: 3, maybe: 2, no: 1 } as Record<string, number>)[a.automatable] ?? 0;
  const rep = ({ yes: 2, sometimes: 1, no: 0 } as Record<string, number>)[a.repetitive] ?? 0;
  const dur = ({ significant: 2, medium: 1, quick: 0 } as Record<string, number>)[a.duration] ?? 0;
  return auto + rep + dur;
}

const buildServer = () => {
  const server = new McpServer({ name: 'toil-tracker', version: '0.1.0' });

  server.tool(
    'get_status',
    'Returns the current status of the Toil Tracker server.',
    {},
    async () => ({ content: [{ type: 'text', text: 'Toil Tracker MCP server is running.' }] })
  );

  server.tool(
    'get_session',
    'Get full session data including all activities and participants.',
    { sessionId: z.string().describe('The session ID') },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };
      const data = {
        id: session.id,
        title: session.title,
        status: session.status,
        participants: Array.from(session.participants.values()).map(p => p.name),
        activityCount: session.activities.length,
        activities: session.activities,
      };
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_activities',
    'List activities in a session with optional filters.',
    {
      sessionId: z.string().describe('The session ID'),
      automatable: z.enum(['yes', 'maybe', 'no']).optional().describe('Filter by automation potential'),
      priority: z.enum(['high', 'medium', 'low']).optional().describe('Filter by priority'),
      flagged: z.boolean().optional().describe('Filter to flagged activities only'),
    },
    async ({ sessionId, automatable, priority, flagged }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };
      let activities = session.activities;
      if (automatable) activities = activities.filter(a => a.automatable === automatable);
      if (priority) activities = activities.filter(a => a.priority === priority);
      if (flagged !== undefined) activities = activities.filter(a => a.flagged === flagged);
      return { content: [{ type: 'text', text: JSON.stringify(activities, null, 2) }] };
    }
  );

  server.tool(
    'get_automation_candidates',
    'Return activities ranked by automation potential score.',
    {
      sessionId: z.string().describe('The session ID'),
      limit: z.number().int().min(1).max(50).default(10).describe('Max candidates to return'),
    },
    async ({ sessionId, limit }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };
      const ranked = [...session.activities]
        .map(a => ({ ...a, score: automationScore(a) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      return { content: [{ type: 'text', text: JSON.stringify(ranked, null, 2) }] };
    }
  );

  server.tool(
    'flag_activity',
    'Flag or unflag an activity for facilitator attention.',
    {
      sessionId: z.string().describe('The session ID'),
      activityId: z.string().describe('The activity ID'),
      flagged: z.boolean().describe('true to flag, false to unflag'),
    },
    async ({ sessionId, activityId, flagged }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };
      const activity = session.activities.find(a => a.id === activityId);
      if (!activity) return { content: [{ type: 'text', text: 'Activity not found.' }] };
      activity.flagged = flagged;
      return { content: [{ type: 'text', text: `Activity "${activity.title}" ${flagged ? 'flagged' : 'unflagged'}.` }] };
    }
  );

  server.tool(
    'set_priority',
    'Set the priority of an activity.',
    {
      sessionId: z.string().describe('The session ID'),
      activityId: z.string().describe('The activity ID'),
      priority: z.enum(['high', 'medium', 'low']).describe('Priority level'),
    },
    async ({ sessionId, activityId, priority }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };
      const activity = session.activities.find(a => a.id === activityId);
      if (!activity) return { content: [{ type: 'text', text: 'Activity not found.' }] };
      activity.priority = priority;
      return { content: [{ type: 'text', text: `Priority for "${activity.title}" set to ${priority}.` }] };
    }
  );

  server.tool(
    'generate_summary',
    'Generate a plain-text summary of the session suitable for sharing.',
    { sessionId: z.string().describe('The session ID') },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };
      const total = session.activities.length;
      const yesAuto = session.activities.filter(a => a.automatable === 'yes').length;
      const maybeAuto = session.activities.filter(a => a.automatable === 'maybe').length;
      const prioritized = session.activities.filter(a => a.priority).length;
      const top3 = [...session.activities]
        .sort((a, b) => automationScore(b) - automationScore(a))
        .slice(0, 3)
        .map(a => `- ${a.title} (automatable: ${a.automatable}, ${a.duration}, repetitive: ${a.repetitive})`)
        .join('\n');
      const summary = [
        `Session: ${session.title}`,
        `Status: ${session.status}`,
        `Participants: ${session.participants.size}`,
        `Total activities: ${total}`,
        `High automation potential: ${yesAuto}`,
        `Medium automation potential: ${maybeAuto}`,
        `Prioritized: ${prioritized}`,
        '',
        'Top automation candidates:',
        top3 || '(none yet)',
      ].join('\n');
      return { content: [{ type: 'text', text: summary }] };
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
