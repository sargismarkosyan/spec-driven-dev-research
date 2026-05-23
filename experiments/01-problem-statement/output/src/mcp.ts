import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import state from './store';

const buildServer = () => {
  const server = new McpServer({
    name: 'toil-tracker',
    version: '1.0.0',
  });

  server.tool(
    'list_sessions',
    'List all sessions with their phase and activity count.',
    {},
    async () => {
      const sessions = Array.from(state.sessions.values()).map(s => ({
        id: s.id,
        phase: s.phase,
        createdAt: s.createdAt,
        activityCount: state.activities.filter(a => a.sessionId === s.id).length,
      }));
      return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] };
    }
  );

  server.tool(
    'get_session',
    'Get full details for a session including all activities and participants.',
    { sessionId: z.string().describe('The session ID') },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };
      const activities = state.activities.filter(a => a.sessionId === sessionId);
      const participants = Array.from(state.participants.values()).filter(p => p.sessionId === sessionId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ session, activities, participants }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'list_activities',
    'List activities for a session. Optionally filter by flagged status or energy type.',
    {
      sessionId: z.string().describe('The session ID'),
      flaggedOnly: z.boolean().optional().describe('If true, return only flagged activities'),
      energy: z.enum(['drains', 'energizes']).optional().describe('Filter by energy type'),
    },
    async ({ sessionId, flaggedOnly, energy }) => {
      let activities = state.activities.filter(a => a.sessionId === sessionId);
      if (flaggedOnly) activities = activities.filter(a => a.flagged);
      if (energy) activities = activities.filter(a => a.energy === energy);
      activities = activities.sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);
      return { content: [{ type: 'text', text: JSON.stringify(activities, null, 2) }] };
    }
  );

  server.tool(
    'get_top_automation_candidates',
    'Return the activities that are most draining and most time-consuming — the highest-value candidates for automation or elimination.',
    {
      sessionId: z.string().describe('The session ID'),
      limit: z.number().optional().describe('Max number to return (default 5)'),
    },
    async ({ sessionId, limit = 5 }) => {
      const activities = state.activities
        .filter(a => a.sessionId === sessionId && a.energy === 'drains')
        .sort((a, b) => b.weeklyMinutes - a.weeklyMinutes)
        .slice(0, limit);
      return { content: [{ type: 'text', text: JSON.stringify(activities, null, 2) }] };
    }
  );

  server.tool(
    'flag_activity',
    'Flag or unflag an activity as a priority item.',
    {
      activityId: z.string().describe('The activity ID'),
      flagged: z.boolean().describe('true to flag, false to unflag'),
    },
    async ({ activityId, flagged }) => {
      const activity = state.activities.find(a => a.id === activityId);
      if (!activity) return { content: [{ type: 'text', text: 'Activity not found.' }] };
      activity.flagged = flagged;
      return { content: [{ type: 'text', text: `Activity ${flagged ? 'flagged' : 'unflagged'}: ${activity.description}` }] };
    }
  );

  server.tool(
    'set_verdict',
    'Set the automation verdict for an activity.',
    {
      activityId: z.string().describe('The activity ID'),
      verdict: z.enum(['automate', 'eliminate', 'handoff', 'keep']).describe('The verdict'),
    },
    async ({ activityId, verdict }) => {
      const activity = state.activities.find(a => a.id === activityId);
      if (!activity) return { content: [{ type: 'text', text: 'Activity not found.' }] };
      activity.verdict = verdict;
      return { content: [{ type: 'text', text: `Verdict set to "${verdict}" for: ${activity.description}` }] };
    }
  );

  server.tool(
    'get_session_summary',
    'Generate a text summary of the session: participant count, total toil logged, top drains, and flagged priorities.',
    { sessionId: z.string().describe('The session ID') },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };
      const activities = state.activities.filter(a => a.sessionId === sessionId);
      const participants = Array.from(state.participants.values()).filter(p => p.sessionId === sessionId);
      const totalMinutes = activities.reduce((s, a) => s + a.weeklyMinutes, 0);
      const drainingMinutes = activities.filter(a => a.energy === 'drains').reduce((s, a) => s + a.weeklyMinutes, 0);
      const flagged = activities.filter(a => a.flagged).sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);
      const top3 = activities.filter(a => a.energy === 'drains').sort((a, b) => b.weeklyMinutes - a.weeklyMinutes).slice(0, 3);

      const lines = [
        `## Session Summary`,
        `- Phase: ${session.phase}`,
        `- Participants: ${participants.length}`,
        `- Activities logged: ${activities.length}`,
        `- Total toil per week: ${totalMinutes} minutes`,
        `- Draining toil per week: ${drainingMinutes} minutes`,
        ``,
        `### Top Drains`,
        ...top3.map(a => `- ${a.description} — ${a.weeklyMinutes} min/week (${a.authorName})`),
        ``,
        `### Flagged Priorities`,
        ...(flagged.length === 0
          ? ['_None flagged yet._']
          : flagged.map(a => `- ${a.description} — ${a.weeklyMinutes} min/week${a.verdict ? ` [${a.verdict}]` : ''}`)),
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );

  server.tool(
    'draft_backlog_items',
    'Draft backlog items from flagged activities, formatted for import into a planning tool.',
    { sessionId: z.string().describe('The session ID') },
    async ({ sessionId }) => {
      const activities = state.activities
        .filter(a => a.sessionId === sessionId && a.flagged)
        .sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);
      if (activities.length === 0) {
        return { content: [{ type: 'text', text: 'No flagged activities to convert to backlog items.' }] };
      }
      const items = activities.map((a, i) => {
        const verdict = a.verdict ?? 'investigate';
        const authors = a.mergedAuthorNames.length > 0
          ? [a.authorName, ...a.mergedAuthorNames].join(', ')
          : a.authorName;
        return [
          `### [TOIL-${i + 1}] ${verdict.toUpperCase()}: ${a.description}`,
          `**Priority:** ${i + 1} of ${activities.length}`,
          `**Weekly cost:** ${a.weeklyMinutes} min/week`,
          `**Reported by:** ${authors}`,
          `**Action:** ${verdict}`,
          ``,
          `**Background:** This activity was identified as draining toil during a team retrospective. ` +
          `It consumes approximately ${a.weeklyMinutes} minutes of team time per week. ` +
          `The team voted to ${verdict} it.`,
          ``,
          `**Acceptance criteria:**`,
          `- [ ] Outcome of ${verdict} is implemented or handed off`,
          `- [ ] Engineers confirm they no longer do this manually`,
          `- [ ] Time saved is measured at next retrospective`,
          ``,
        ].join('\n');
      });
      return { content: [{ type: 'text', text: items.join('\n---\n\n') }] };
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
