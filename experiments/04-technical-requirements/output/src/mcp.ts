import type { Express, Request, Response } from 'express';
import type { Server } from 'socket.io';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import state, {
  genId,
  effortHrsPerWk,
  effortDisplay,
  ALL_CATEGORIES,
} from './store';
import type { Activity, EditEntry } from './store';

const buildServer = (io: Server) => {
  const server = new McpServer({ name: 'toil-tracker', version: '1.0.0' });

  server.tool(
    'create_session',
    'Creates a new work audit session and returns the session ID, facilitator token, and share URL.',
    { name: z.string() },
    async ({ name }) => {
      const id = genId(10);
      const facilitatorToken = genId(21);
      const session = {
        id,
        name,
        createdAt: new Date(),
        facilitatorToken,
        status: 'open' as const,
        submissionEndsAt: null,
        enabledCategories: [...ALL_CATEGORIES],
        liveFeedEnabled: true,
      };
      state.sessions.set(id, session);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            sessionId: id,
            facilitatorToken,
            shareUrl: `http://localhost:${process.env.PORT ?? 3000}/session/${id}`,
          }),
        }],
      };
    }
  );

  server.tool(
    'get_session',
    'Returns the full session state including participants and activities with computed effort hours per week.',
    { sessionId: z.string() },
    async ({ sessionId }) => {
      const session = state.sessions.get(sessionId);
      if (!session) throw new Error('session not found');
      const participants = Array.from(state.participants.values()).filter(
        (p) => p.sessionId === sessionId
      );
      const activities = Array.from(state.activities.values())
        .filter((a) => a.sessionId === sessionId)
        .map((a) => ({ ...a, effortHrsPerWk: effortHrsPerWk(a) }));
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ session, participants, activities }),
        }],
      };
    }
  );

  server.tool(
    'join_session',
    'Joins a session as a participant and returns the participant ID.',
    {
      sessionId: z.string(),
      name: z.string(),
      role: z.enum(['IC', 'EM', 'PM', 'UX', 'other']).optional(),
    },
    async ({ sessionId, name, role }) => {
      const session = state.sessions.get(sessionId);
      if (!session) throw new Error('session not found');
      if (session.status === 'closed') throw new Error('session is closed');
      const participant = {
        id: genId(10),
        sessionId,
        name,
        role: (role ?? 'IC') as 'IC' | 'EM' | 'PM' | 'UX' | 'other',
        joinedAt: new Date(),
      };
      state.participants.set(participant.id, participant);
      io.to(`session:${sessionId}`).emit('participant:joined', { participant });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ participantId: participant.id }) }],
      };
    }
  );

  server.tool(
    'add_activity',
    'Adds a new activity to a session on behalf of a participant.',
    {
      sessionId: z.string(),
      participantId: z.string(),
      title: z.string(),
      tpo: z.enum(['<30m', '30m-2h', 'half-day', 'day+']),
      freq: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'adhoc']),
      energy: z.enum(['energizing', 'neutral', 'draining']),
    },
    async ({ sessionId, participantId, title, tpo, freq, energy }) => {
      const session = state.sessions.get(sessionId);
      if (!session) throw new Error('session not found');
      if (session.status !== 'open') throw new Error('session is not open');
      const participant = state.participants.get(participantId);
      if (!participant || participant.sessionId !== sessionId)
        throw new Error('participant not in session');

      const activity: Activity = {
        id: genId(10),
        sessionId,
        participantId,
        contributorIds: [participantId],
        title,
        tpo,
        freq,
        energy,
        teamAuto: 'unclassified',
        flaggedByFacilitator: false,
        mergedFrom: null,
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.activities.set(activity.id, activity);
      io.to(`session:${sessionId}`).emit('activity:added', { activity });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ activity }) }],
      };
    }
  );

  server.tool(
    'update_activity',
    'Updates an existing activity (facilitator only).',
    {
      sessionId: z.string(),
      activityId: z.string(),
      facilitatorToken: z.string(),
      title: z.string().optional(),
      tpo: z.enum(['<30m', '30m-2h', 'half-day', 'day+']).optional(),
      freq: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'adhoc']).optional(),
      energy: z.enum(['energizing', 'neutral', 'draining']).optional(),
    },
    async ({ sessionId, activityId, facilitatorToken, title, tpo, freq, energy }) => {
      const session = state.sessions.get(sessionId);
      if (!session) throw new Error('session not found');
      if (facilitatorToken !== session.facilitatorToken)
        throw new Error('invalid facilitator token');
      const activity = state.activities.get(activityId);
      if (!activity || activity.sessionId !== sessionId)
        throw new Error('activity not found');

      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (title !== undefined && title !== activity.title) { changes.title = { from: activity.title, to: title }; activity.title = title; }
      if (tpo !== undefined && tpo !== activity.tpo) { changes.tpo = { from: activity.tpo, to: tpo }; activity.tpo = tpo; }
      if (freq !== undefined && freq !== activity.freq) { changes.freq = { from: activity.freq, to: freq }; activity.freq = freq; }
      if (energy !== undefined && energy !== activity.energy) { changes.energy = { from: activity.energy, to: energy }; activity.energy = energy; }

      if (Object.keys(changes).length > 0) {
        const entry: EditEntry = { editedBy: 'facilitator', editedAt: new Date(), changes };
        activity.editHistory.push(entry);
        activity.updatedAt = new Date();
      }
      io.to(`session:${sessionId}`).emit('activity:updated', { activity });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ activity }) }],
      };
    }
  );

  server.tool(
    'list_activities',
    'Lists activities for a session with optional filters and sorting. Each activity includes effortHrsPerWk.',
    {
      sessionId: z.string(),
      energy: z.enum(['energizing', 'neutral', 'draining']).optional(),
      teamAuto: z.enum(['yes', 'maybe', 'no', 'unclassified']).optional(),
      flagged: z.boolean().optional(),
      sortBy: z.enum(['effort', 'createdAt']).optional(),
    },
    async ({ sessionId, energy, teamAuto, flagged, sortBy }) => {
      let activities = Array.from(state.activities.values()).filter(
        (a) => a.sessionId === sessionId
      );
      if (energy !== undefined) activities = activities.filter((a) => a.energy === energy);
      if (teamAuto !== undefined) activities = activities.filter((a) => a.teamAuto === teamAuto);
      if (flagged !== undefined) activities = activities.filter((a) => a.flaggedByFacilitator === flagged);

      if (sortBy === 'effort') {
        activities.sort((a, b) => effortHrsPerWk(b) - effortHrsPerWk(a));
      } else {
        activities.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }

      const result = activities.map((a) => ({
        ...a,
        effortHrsPerWk: effortHrsPerWk(a),
        effortDisplay: effortDisplay(effortHrsPerWk(a)),
      }));
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ activities: result }) }],
      };
    }
  );

  server.tool(
    'classify_activity',
    'Classifies an activity automatability verdict (facilitator only).',
    {
      sessionId: z.string(),
      activityId: z.string(),
      facilitatorToken: z.string(),
      teamAuto: z.enum(['yes', 'maybe', 'no']),
    },
    async ({ sessionId, activityId, facilitatorToken, teamAuto }) => {
      const session = state.sessions.get(sessionId);
      if (!session) throw new Error('session not found');
      if (facilitatorToken !== session.facilitatorToken)
        throw new Error('invalid facilitator token');
      const activity = state.activities.get(activityId);
      if (!activity || activity.sessionId !== sessionId)
        throw new Error('activity not found');
      activity.teamAuto = teamAuto;
      activity.updatedAt = new Date();
      io.to(`session:${sessionId}`).emit('activity:classified', { activityId, teamAuto });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ activity }) }],
      };
    }
  );

  server.tool(
    'flag_activity',
    'Flags or unflags an activity for priority review (facilitator only).',
    {
      sessionId: z.string(),
      activityId: z.string(),
      facilitatorToken: z.string(),
      flagged: z.boolean(),
    },
    async ({ sessionId, activityId, facilitatorToken, flagged }) => {
      const session = state.sessions.get(sessionId);
      if (!session) throw new Error('session not found');
      if (facilitatorToken !== session.facilitatorToken)
        throw new Error('invalid facilitator token');
      const activity = state.activities.get(activityId);
      if (!activity || activity.sessionId !== sessionId)
        throw new Error('activity not found');
      activity.flaggedByFacilitator = flagged;
      activity.updatedAt = new Date();
      io.to(`session:${sessionId}`).emit('activity:flagged', { activityId, flagged });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ activity }) }],
      };
    }
  );

  server.tool(
    'close_session',
    'Changes session status to reviewing or closed (facilitator only).',
    {
      sessionId: z.string(),
      facilitatorToken: z.string(),
      status: z.enum(['reviewing', 'closed']),
    },
    async ({ sessionId, facilitatorToken, status }) => {
      const session = state.sessions.get(sessionId);
      if (!session) throw new Error('session not found');
      if (facilitatorToken !== session.facilitatorToken)
        throw new Error('invalid facilitator token');
      session.status = status;
      io.to(`session:${sessionId}`).emit('session:statusChanged', { status });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ session }) }],
      };
    }
  );

  server.tool(
    'export_session',
    'Exports flagged activities as Markdown (facilitator only).',
    {
      sessionId: z.string(),
      facilitatorToken: z.string(),
    },
    async ({ sessionId, facilitatorToken }) => {
      const session = state.sessions.get(sessionId);
      if (!session) throw new Error('session not found');
      if (facilitatorToken !== session.facilitatorToken)
        throw new Error('invalid facilitator token');

      const flagged = Array.from(state.activities.values()).filter(
        (a) => a.sessionId === sessionId && a.flaggedByFacilitator
      );

      let md = `# ${session.name} — Work Audit Export\n\n`;
      md += `> Automatability was classified by the team during discussion — not self-reported.\n\n`;
      for (const a of flagged) {
        const hrs = effortHrsPerWk(a);
        const contributors = a.contributorIds
          .map((id) => state.participants.get(id)?.name ?? 'Unknown')
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .join(', ');
        md += `### ${a.title} (${effortDisplay(hrs)})\n`;
        md += `**Contributors:** ${contributors}\n`;
        md += `**Automatability:** ${a.teamAuto} (team verdict)\n`;
        md += `**Tags:** ${a.tpo} · ${a.freq} · ${a.energy}\n\n`;
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ markdown: md }) }],
      };
    }
  );

  return server;
};

export const setupMCP = (app: Express, io: Server) => {
  app.post('/mcp', async (req: Request, res: Response) => {
    const server = buildServer(io);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    const server = buildServer(io);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });
};
