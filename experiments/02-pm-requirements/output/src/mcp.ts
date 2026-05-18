import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import state from './store';

const buildServer = () => {
  const server = new McpServer({ name: 'toil-tracker', version: '0.1.0' });

  server.tool('list_sessions', 'List all active Toil Tracker sessions.', {}, async () => ({
    content: [{ type: 'text', text: JSON.stringify(Array.from(state.sessions.values()), null, 2) }],
  }));

  server.tool(
    'get_session',
    'Get full details and all activities for a session.',
    { sessionId: z.string().describe('The session ID') },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };
      const activities = state.activities.filter((a) => a.sessionId === sessionId);
      const users = Array.from(state.users.values()).filter((u) => u.sessionId === sessionId);
      return {
        content: [{ type: 'text', text: JSON.stringify({ session, activities, users }, null, 2) }],
      };
    }
  );

  server.tool(
    'list_activities',
    'List activities for a session with optional attribute filters.',
    {
      sessionId: z.string().describe('The session ID'),
      automationPotential: z
        .enum(['yes', 'maybe', 'no'])
        .optional()
        .describe('Filter by automation potential'),
      flagged: z.boolean().optional().describe('If true, return only flagged activities'),
    },
    async ({ sessionId, automationPotential, flagged }) => {
      let activities = state.activities.filter((a) => a.sessionId === sessionId);
      if (automationPotential) activities = activities.filter((a) => a.automationPotential === automationPotential);
      if (flagged !== undefined) activities = activities.filter((a) => a.flagged === flagged);
      return {
        content: [{ type: 'text', text: JSON.stringify(activities, null, 2) }],
      };
    }
  );

  server.tool(
    'summarize_session',
    'Return a statistical summary of a session broken down by each attribute.',
    { sessionId: z.string() },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };
      const acts = state.activities.filter((a) => a.sessionId === sessionId);

      const count = (key: keyof typeof acts[0], val: string) =>
        acts.filter((a) => a[key] === val).length;

      const summary = {
        sessionName: session.name,
        totalActivities: acts.length,
        flaggedCount: acts.filter((a) => a.flagged).length,
        byAutomationPotential: { yes: count('automationPotential', 'yes'), maybe: count('automationPotential', 'maybe'), no: count('automationPotential', 'no') },
        byTimeEstimate: { quick: count('timeEstimate', 'quick'), medium: count('timeEstimate', 'medium'), significant: count('timeEstimate', 'significant') },
        byEnjoyment: { yes: count('enjoyment', 'yes'), meh: count('enjoyment', 'meh'), no: count('enjoyment', 'no') },
        byRepetitiveness: { yes: count('repetitiveness', 'yes'), sometimes: count('repetitiveness', 'sometimes'), no: count('repetitiveness', 'no') },
      };

      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    }
  );

  server.tool(
    'get_automation_candidates',
    'Identify and score the highest-value automation opportunities in a session.',
    { sessionId: z.string() },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return { content: [{ type: 'text', text: 'Session not found.' }] };

      const acts = state.activities.filter((a) => a.sessionId === sessionId);

      // Score: automationPotential=yes (+3), maybe (+1); repetitiveness=yes (+2), sometimes (+1);
      // enjoyment=no (+2), meh (+1). Higher score = stronger candidate.
      const scored = acts
        .filter((a) => a.automationPotential !== 'no')
        .map((a) => {
          let score = 0;
          if (a.automationPotential === 'yes') score += 3;
          else if (a.automationPotential === 'maybe') score += 1;
          if (a.repetitiveness === 'yes') score += 2;
          else if (a.repetitiveness === 'sometimes') score += 1;
          if (a.enjoyment === 'no') score += 2;
          else if (a.enjoyment === 'meh') score += 1;
          return { ...a, score };
        })
        .sort((a, b) => b.score - a.score);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            sessionName: session.name,
            totalCandidates: scored.length,
            candidates: scored,
          }, null, 2),
        }],
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
