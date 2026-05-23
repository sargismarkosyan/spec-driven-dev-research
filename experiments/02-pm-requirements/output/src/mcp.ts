import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import state, { calcEffort, similarityScore } from './store';

const buildServer = () => {
  const server = new McpServer({ name: 'toil-tracker', version: '1.0.0' });

  // ── create_session ──────────────────────────────────────────────────────
  server.tool(
    'create_session',
    'Create a new Toil Tracker session. Returns the session id and facilitator token.',
    {
      name: z.string().describe('Session name'),
      windowMinutes: z.number().nullable().optional().describe('Soft window in minutes, or null for untimed'),
      liveFeedEnabled: z.boolean().optional().describe('Show live team feed to engineers'),
    },
    async ({ name, windowMinutes, liveFeedEnabled }) => {
      const id = crypto.randomUUID();
      const facilitatorToken = crypto.randomUUID();
      const session = {
        id,
        name,
        facilitatorToken,
        status: 'lobby' as const,
        windowMinutes: windowMinutes ?? null,
        windowStartedAt: null,
        enabledCategories: ['yesterday','meetings','rituals','oncall','quarterly','chores','handoffs','automation','other'] as const,
        liveFeedEnabled: liveFeedEnabled ?? true,
        participants: new Map(),
        activities: [],
        discussionQueue: [],
        discussionIndex: 0,
        createdAt: new Date(),
      };
      state.sessions.set(id, session as never);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ sessionId: id, facilitatorToken }) }],
      };
    }
  );

  // ── list_sessions ───────────────────────────────────────────────────────
  server.tool(
    'list_sessions',
    'List all active sessions.',
    {},
    async () => {
      const sessions = Array.from(state.sessions.values()).map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        participantCount: s.participants.size,
        activityCount: s.activities.length,
      }));
      return { content: [{ type: 'text' as const, text: JSON.stringify(sessions) }] };
    }
  );

  // ── get_session ─────────────────────────────────────────────────────────
  server.tool(
    'get_session',
    'Get full session data including all activities and participants.',
    { sessionId: z.string() },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }] };
      const data = {
        ...session,
        participants: Array.from(session.participants.values()),
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
    }
  );

  // ── add_activity ────────────────────────────────────────────────────────
  server.tool(
    'add_activity',
    'Add an activity to a session on behalf of a participant.',
    {
      sessionId: z.string(),
      authorName: z.string(),
      title: z.string(),
      tpo: z.enum(['lt30', '30to2h', 'halfday', 'fullday']),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'adhoc']),
      energy: z.enum(['energizes', 'neutral', 'drains']),
    },
    async ({ sessionId, authorName, title, tpo, frequency, energy }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }] };
      const activity = {
        id: crypto.randomUUID(),
        sessionId,
        authorId: 'mcp',
        authorName,
        title,
        tpo,
        frequency,
        energy,
        effortHrsPerWeek: calcEffort(tpo, frequency),
        autoVerdict: null,
        flagged: false,
        discussionNote: '',
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      session.activities.push(activity as never);
      return { content: [{ type: 'text' as const, text: JSON.stringify(activity) }] };
    }
  );

  // ── classify_activity ───────────────────────────────────────────────────
  server.tool(
    'classify_activity',
    'Set automatability verdict for an activity. IMPORTANT: Present the candidate to the facilitator for confirmation before calling this — do not classify autonomously.',
    {
      sessionId: z.string(),
      activityId: z.string(),
      verdict: z.enum(['yes', 'maybe', 'no']),
      confirmedByFacilitator: z.boolean().describe('Must be true — confirm the facilitator approved this classification'),
    },
    async ({ sessionId, activityId, verdict, confirmedByFacilitator }) => {
      if (!confirmedByFacilitator) {
        return { content: [{ type: 'text' as const, text: 'Classification must be confirmed by the facilitator first.' }] };
      }
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }] };
      const activity = session.activities.find((a) => a.id === activityId);
      if (!activity) return { content: [{ type: 'text' as const, text: 'Activity not found' }] };
      activity.autoVerdict = verdict;
      activity.updatedAt = new Date();
      return { content: [{ type: 'text' as const, text: JSON.stringify(activity) }] };
    }
  );

  // ── flag_activity ───────────────────────────────────────────────────────
  server.tool(
    'flag_activity',
    'Flag or unflag an activity as a priority. IMPORTANT: Present candidates to the facilitator — do not flag autonomously.',
    {
      sessionId: z.string(),
      activityId: z.string(),
      flagged: z.boolean(),
      confirmedByFacilitator: z.boolean(),
    },
    async ({ sessionId, activityId, flagged, confirmedByFacilitator }) => {
      if (!confirmedByFacilitator) {
        return { content: [{ type: 'text' as const, text: 'Flagging must be confirmed by the facilitator first.' }] };
      }
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }] };
      const activity = session.activities.find((a) => a.id === activityId);
      if (!activity) return { content: [{ type: 'text' as const, text: 'Activity not found' }] };
      activity.flagged = flagged;
      return { content: [{ type: 'text' as const, text: JSON.stringify(activity) }] };
    }
  );

  // ── summarize_session ───────────────────────────────────────────────────
  server.tool(
    'summarize_session',
    'Return structured data for an AI to summarize session results. The AI should format this into a human-readable summary.',
    { sessionId: z.string() },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }] };
      const acts = session.activities;
      const totalEffort = acts.reduce((s, a) => s + a.effortHrsPerWeek, 0);
      const classified = acts.filter((a) => a.autoVerdict !== null).length;
      const flagged = acts.filter((a) => a.flagged).length;
      const byEnergy = {
        drains: acts.filter((a) => a.energy === 'drains').length,
        neutral: acts.filter((a) => a.energy === 'neutral').length,
        energizes: acts.filter((a) => a.energy === 'energizes').length,
      };
      const byVerdict = {
        yes: acts.filter((a) => a.autoVerdict === 'yes').length,
        maybe: acts.filter((a) => a.autoVerdict === 'maybe').length,
        no: acts.filter((a) => a.autoVerdict === 'no').length,
        unclassified: acts.filter((a) => a.autoVerdict === null).length,
      };
      const summary = {
        sessionName: session.name,
        participantCount: session.participants.size,
        activityCount: acts.length,
        totalEffortHrsPerWeek: Math.round(totalEffort * 100) / 100,
        classifiedCount: classified,
        flaggedCount: flagged,
        byEnergy,
        byVerdict,
        topByEffort: [...acts].sort((a, b) => b.effortHrsPerWeek - a.effortHrsPerWeek).slice(0, 5).map((a) => ({
          title: a.title,
          author: a.authorName,
          effortHrsPerWeek: a.effortHrsPerWeek,
          energy: a.energy,
          verdict: a.autoVerdict,
        })),
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(summary) }] };
    }
  );

  // ── find_automation_candidates ──────────────────────────────────────────
  server.tool(
    'find_automation_candidates',
    'Surface top automation candidates by effort + energy drain. Returns candidates for the facilitator to review — do not classify autonomously.',
    { sessionId: z.string(), limit: z.number().optional() },
    async ({ sessionId, limit }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }] };
      const candidates = session.activities
        .filter((a) => a.autoVerdict === null)
        .map((a) => ({
          ...a,
          score: (a.effortHrsPerWeek * (a.energy === 'drains' ? 2 : a.energy === 'neutral' ? 1.2 : 0.8)),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit ?? 10);
      return {
        content: [{
          type: 'text' as const,
          text: `Automation candidates (facilitator must confirm before classifying):\n${JSON.stringify(candidates)}`,
        }],
      };
    }
  );

  // ── draft_backlog ───────────────────────────────────────────────────────
  server.tool(
    'draft_backlog',
    'Return flagged activities formatted as backlog item drafts. The AI uses these to draft tickets — facilitator reviews before creating anything.',
    { sessionId: z.string() },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }] };
      const items = session.activities
        .filter((a) => a.flagged)
        .map((a) => ({
          title: `[Automate] ${a.title}`,
          description: [
            `Reported by: ${a.authorName}`,
            `Effort: ~${a.effortHrsPerWeek}h/wk`,
            `Energy: ${a.energy}`,
            `Verdict: ${a.autoVerdict ?? 'unclassified'}`,
            a.discussionNote ? `Notes: ${a.discussionNote}` : null,
          ].filter(Boolean).join('\n'),
          effort: a.effortHrsPerWeek,
          verdict: a.autoVerdict,
        }));
      const note = '\n\nNOTE: Automatability was classified by the team during discussion — not self-reported by engineers.';
      return { content: [{ type: 'text' as const, text: JSON.stringify(items) + note }] };
    }
  );

  // ── query_activities ────────────────────────────────────────────────────
  server.tool(
    'query_activities',
    'Query activities in a session with optional filters.',
    {
      sessionId: z.string(),
      energy: z.enum(['energizes', 'neutral', 'drains']).optional(),
      verdict: z.enum(['yes', 'maybe', 'no', 'unclassified']).optional(),
      flagged: z.boolean().optional(),
      minEffort: z.number().optional(),
    },
    async ({ sessionId, energy, verdict, flagged, minEffort }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text' as const, text: 'Session not found' }] };
      let acts = session.activities;
      if (energy) acts = acts.filter((a) => a.energy === energy);
      if (verdict) acts = acts.filter((a) => verdict === 'unclassified' ? a.autoVerdict === null : a.autoVerdict === verdict);
      if (flagged !== undefined) acts = acts.filter((a) => a.flagged === flagged);
      if (minEffort !== undefined) acts = acts.filter((a) => a.effortHrsPerWeek >= minEffort);
      return { content: [{ type: 'text' as const, text: JSON.stringify(acts) }] };
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
