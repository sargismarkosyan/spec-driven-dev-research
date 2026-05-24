import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import sessions from './store';

const buildServer = () => {
  const server = new McpServer({ name: 'work-audit', version: '0.3.0' });

  server.tool('list_sessions', 'List all active Work Audit sessions.', {}, async () => ({
    content: [{
      type: 'text' as const,
      text: JSON.stringify(
        Array.from(sessions.values()).map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          participants: s.participants.size,
          activities: s.activities.size,
        })),
        null, 2
      ),
    }],
  }));

  server.tool(
    'get_session',
    'Get full state of a Work Audit session, including all activities.',
    { sessionId: z.string().describe('Session ID') },
    async ({ sessionId }) => {
      const session = sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found.' }] };
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            ...session,
            participants: Array.from(session.participants.values()),
            activities: Array.from(session.activities.values()),
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'export_session_markdown',
    'Export a Work Audit session as a Markdown priority report.',
    { sessionId: z.string().describe('Session ID') },
    async ({ sessionId }) => {
      const session = sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found.' }] };

      const acts = Array.from(session.activities.values());
      const flagged = acts.filter(a => a.flagged);
      const auto = acts.filter(a => a.teamAuto === 'yes');
      const maybe = acts.filter(a => a.teamAuto === 'maybe');
      const manual = acts.filter(a => a.teamAuto === 'no');
      const unclassed = acts.filter(a => a.teamAuto === 'unclassified');

      const fmtAct = (a: typeof acts[0]) =>
        `- **${a.title}** — ${a.participantName} · ${a.tpo} · ${a.freq} · ${a.energy}${a.flagged ? ' ★' : ''}${a.discussionNote ? `\n  _${a.discussionNote}_` : ''}`;

      const md = [
        `# Work Audit · ${session.name}`,
        `Facilitator: ${session.facilitatorName} · ${acts.length} activities · ${session.participants.size} participants`,
        '',
        `## ★ Flagged priorities (${flagged.length})`,
        ...flagged.map(fmtAct),
        '',
        `## Automatable (${auto.length})`,
        ...auto.map(fmtAct),
        '',
        `## Maybe automatable (${maybe.length})`,
        ...maybe.map(fmtAct),
        '',
        `## Manual forever (${manual.length})`,
        ...manual.map(fmtAct),
        '',
        `## Unclassified (${unclassed.length})`,
        ...unclassed.map(fmtAct),
        '',
        '---',
        '_Automatability classified by team during discussion — not self-report._',
      ].join('\n');

      return { content: [{ type: 'text' as const, text: md }] };
    }
  );

  server.tool(
    'list_activities',
    'List activities from a session, optionally filtered.',
    {
      sessionId: z.string().describe('The session to query'),
      filter: z.enum(['all', 'flagged', 'automatable', 'draining']).optional().describe('Filter: all, flagged, automatable, or draining'),
    },
    async ({ sessionId, filter = 'all' }) => {
      const session = sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found.' }] };

      let acts = Array.from(session.activities.values());
      if (filter === 'flagged') acts = acts.filter(a => a.flagged);
      if (filter === 'automatable') acts = acts.filter(a => a.teamAuto === 'yes');
      if (filter === 'draining') acts = acts.filter(a => a.energy === 'draining');

      return { content: [{ type: 'text' as const, text: JSON.stringify(acts, null, 2) }] };
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
