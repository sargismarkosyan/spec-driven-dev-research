import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import state, { computeWeeklyHours } from './store';

const buildServer = () => {
  const server = new McpServer({
    name: 'toil-tracker',
    version: '1.0.0',
  });

  // ── Tools ──────────────────────────────────────────────────────────────────

  server.tool(
    'list_sessions',
    'List all active sessions with basic metadata.',
    {},
    async () => {
      const sessions = Array.from(state.sessions.values()).map((s) => ({
        id: s.id,
        name: s.name,
        phase: s.phase,
        participantCount: s.participants.size,
        activityCount: Array.from(s.activities.values()).filter((a) => !a.mergedInto).length,
        createdAt: s.createdAt,
      }));
      return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] };
    }
  );

  server.tool(
    'get_session',
    'Get full details of a session including participants and activity summary.',
    { session_id: z.string().describe('The session ID') },
    async ({ session_id }) => {
      const session = state.sessions.get(session_id);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };

      const activeActivities = Array.from(session.activities.values()).filter((a) => !a.mergedInto);
      const flagged = activeActivities.filter((a) => a.flagged).length;
      const discussed = activeActivities.filter((a) => a.discussedAt).length;

      const summary = {
        id: session.id,
        name: session.name,
        phase: session.phase,
        facilitatorName: session.facilitatorName,
        submissionWindowMinutes: session.submissionWindowMinutes,
        showTeamFeed: session.showTeamFeedToEngineers,
        participants: Array.from(session.participants.values()).map((p) => ({
          name: p.name,
          role: p.role,
          isOnline: p.isOnline,
          joinedAt: p.joinedAt,
        })),
        activityCount: activeActivities.length,
        flaggedCount: flagged,
        discussedCount: discussed,
        discussionProgress:
          session.phase === 'discussion'
            ? `${session.discussionIndex + 1} of ${session.discussionOrder.length}`
            : null,
        createdAt: session.createdAt,
      };
      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    }
  );

  server.tool(
    'list_activities',
    'List activities for a session. Optionally filter by energy, flagged status, or automatability verdict.',
    {
      session_id: z.string().describe('The session ID'),
      energy: z
        .enum(['energizes', 'neutral', 'drains'])
        .optional()
        .describe('Filter by energy level'),
      flagged: z.boolean().optional().describe('Filter to flagged activities only'),
      automatability: z
        .enum(['yes', 'maybe', 'no', 'unset'])
        .optional()
        .describe('Filter by automatability verdict'),
    },
    async ({ session_id, energy, flagged, automatability }) => {
      const session = state.sessions.get(session_id);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };

      let activities = Array.from(session.activities.values()).filter((a) => !a.mergedInto);

      if (energy) activities = activities.filter((a) => a.energy === energy);
      if (flagged !== undefined) activities = activities.filter((a) => a.flagged === flagged);
      if (automatability) {
        if (automatability === 'unset') {
          activities = activities.filter((a) => a.automatability === null);
        } else {
          activities = activities.filter((a) => a.automatability === automatability);
        }
      }

      const result = activities.map((a) => ({
        id: a.id,
        title: a.title,
        author: a.authorName,
        coAuthors: a.coAuthors.map((c) => c.name),
        timePerOccurrence: a.timePerOccurrence,
        frequency: a.frequency,
        weeklyHours: computeWeeklyHours(a.timePerOccurrence, a.frequency).toFixed(2),
        energy: a.energy,
        automatability: a.automatability,
        facilitatorNote: a.facilitatorNote || null,
        flagged: a.flagged,
        createdAt: a.createdAt,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_priority_matrix',
    'Get activities organized by the 2×2 priority matrix quadrants (effort × energy).',
    { session_id: z.string().describe('The session ID') },
    async ({ session_id }) => {
      const session = state.sessions.get(session_id);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };

      const activities = Array.from(session.activities.values()).filter((a) => !a.mergedInto);

      const EFFORT_THRESHOLD = 2; // hours/week

      const quadrants: Record<string, typeof activities> = {
        PRIORITY: [],
        TOLERABLE: [],
        STRATEGIC: [],
        HEALTHY: [],
      };

      for (const a of activities) {
        const hrs = computeWeeklyHours(a.timePerOccurrence, a.frequency);
        const highEffort = hrs >= EFFORT_THRESHOLD;
        const draining = a.energy === 'drains';

        if (draining && highEffort) quadrants.PRIORITY.push(a);
        else if (draining && !highEffort) quadrants.TOLERABLE.push(a);
        else if (!draining && highEffort) quadrants.STRATEGIC.push(a);
        else quadrants.HEALTHY.push(a);
      }

      const format = (list: typeof activities) =>
        list.map((a) => ({
          title: a.title,
          author: a.authorName,
          weeklyHours: computeWeeklyHours(a.timePerOccurrence, a.frequency).toFixed(2),
          energy: a.energy,
          automatability: a.automatability,
          flagged: a.flagged,
        }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                PRIORITY: format(quadrants.PRIORITY),
                TOLERABLE: format(quadrants.TOLERABLE),
                STRATEGIC: format(quadrants.STRATEGIC),
                HEALTHY: format(quadrants.HEALTHY),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'export_session',
    'Export flagged activities and session summary for use in planning or backlog creation.',
    { session_id: z.string().describe('The session ID') },
    async ({ session_id }) => {
      const session = state.sessions.get(session_id);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };

      const all = Array.from(session.activities.values()).filter((a) => !a.mergedInto);
      const flagged = all.filter((a) => a.flagged);

      const EFFORT_THRESHOLD = 2;

      const export_ = {
        session: {
          name: session.name,
          date: session.createdAt,
          facilitator: session.facilitatorName,
          participantCount: session.participants.size,
          totalActivities: all.length,
          flaggedActivities: flagged.length,
        },
        flagged: flagged.map((a) => ({
          title: a.title,
          authors: [a.authorName, ...a.coAuthors.map((c) => c.name)].join(', '),
          timePerOccurrence: a.timePerOccurrence,
          frequency: a.frequency,
          weeklyHours: computeWeeklyHours(a.timePerOccurrence, a.frequency).toFixed(2),
          energy: a.energy,
          automatability: a.automatability,
          facilitatorNote: a.facilitatorNote || null,
          quadrant:
            a.energy === 'drains' && computeWeeklyHours(a.timePerOccurrence, a.frequency) >= EFFORT_THRESHOLD
              ? 'PRIORITY'
              : a.energy === 'drains'
              ? 'TOLERABLE'
              : computeWeeklyHours(a.timePerOccurrence, a.frequency) >= EFFORT_THRESHOLD
              ? 'STRATEGIC'
              : 'HEALTHY',
        })),
        stats: {
          byEnergy: {
            drains: all.filter((a) => a.energy === 'drains').length,
            neutral: all.filter((a) => a.energy === 'neutral').length,
            energizes: all.filter((a) => a.energy === 'energizes').length,
          },
          byVerdict: {
            yes: all.filter((a) => a.automatability === 'yes').length,
            maybe: all.filter((a) => a.automatability === 'maybe').length,
            no: all.filter((a) => a.automatability === 'no').length,
            unset: all.filter((a) => a.automatability === null).length,
          },
        },
      };

      return { content: [{ type: 'text', text: JSON.stringify(export_, null, 2) }] };
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
