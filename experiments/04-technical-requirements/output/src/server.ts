import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP } from './mcp';
import state, {
  genId,
  effortHrsPerWk,
  effortDisplay,
  ALL_CATEGORIES,
} from './store';
import type { Activity, EditEntry } from './store';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3040', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  // ── Sessions ────────────────────────────────────────────────────────────────

  app.post('/api/sessions', (req, res) => {
    const { name, submissionWindowMinutes, enabledCategories, liveFeedEnabled } = req.body;
    if (!name) return void res.status(400).json({ error: 'name required' });

    const id = genId(10);
    const facilitatorToken = genId(21);
    const session = {
      id,
      name,
      createdAt: new Date(),
      facilitatorToken,
      status: 'open' as const,
      submissionEndsAt: submissionWindowMinutes
        ? new Date(Date.now() + submissionWindowMinutes * 60 * 1000)
        : null,
      enabledCategories: enabledCategories ?? ALL_CATEGORIES,
      liveFeedEnabled: liveFeedEnabled ?? true,
    };
    state.sessions.set(id, session);
    res.json({
      sessionId: id,
      facilitatorToken,
      shareUrl: `http://${hostname}:${port}/session/${id}`,
    });
  });

  app.get('/api/sessions/:id', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(403).json({ error: 'session not found' });
    const participants = Array.from(state.participants.values()).filter(
      (p) => p.sessionId === req.params.id
    );
    const activities = Array.from(state.activities.values()).filter(
      (a) => a.sessionId === req.params.id
    );
    res.json({ session, participants, activities });
  });

  // ── Participants ─────────────────────────────────────────────────────────────

  app.post('/api/sessions/:id/join', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'session not found' });
    if (session.status === 'closed')
      return void res.status(400).json({ error: 'session is closed' });

    const { name, role } = req.body;
    if (!name) return void res.status(400).json({ error: 'name required' });

    const participant = {
      id: genId(10),
      sessionId: req.params.id,
      name,
      role: (role ?? 'IC') as 'IC' | 'EM' | 'PM' | 'UX' | 'other',
      joinedAt: new Date(),
    };
    state.participants.set(participant.id, participant);
    io.to(`session:${req.params.id}`).emit('participant:joined', { participant });
    res.json({ participantId: participant.id });
  });

  // ── Activities ───────────────────────────────────────────────────────────────

  app.post('/api/sessions/:id/activities', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'session not found' });
    if (session.status !== 'open')
      return void res.status(400).json({ error: 'session is not open' });

    const { participantId, title, tpo, freq, energy } = req.body;
    const participant = state.participants.get(participantId);
    if (!participant || participant.sessionId !== req.params.id)
      return void res.status(403).json({ error: 'participant not in session' });

    const activity: Activity = {
      id: genId(10),
      sessionId: req.params.id,
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
    io.to(`session:${req.params.id}`).emit('activity:added', { activity });
    res.json({ activity });
  });

  app.patch('/api/sessions/:id/activities/:actId', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'session not found' });

    const activity = state.activities.get(req.params.actId);
    if (!activity || activity.sessionId !== req.params.id)
      return void res.status(404).json({ error: 'activity not found' });

    const token = req.query.token as string | undefined;
    const isFacilitator = token === session.facilitatorToken;
    const { participantId, title, tpo, freq, energy } = req.body;

    if (!isFacilitator) {
      if (!participantId || participantId !== activity.participantId)
        return void res.status(403).json({ error: 'not authorized' });
    }

    const editedBy = isFacilitator ? 'facilitator' : (participantId as string);
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (title !== undefined && title !== activity.title) {
      changes.title = { from: activity.title, to: title };
      activity.title = title;
    }
    if (tpo !== undefined && tpo !== activity.tpo) {
      changes.tpo = { from: activity.tpo, to: tpo };
      activity.tpo = tpo;
    }
    if (freq !== undefined && freq !== activity.freq) {
      changes.freq = { from: activity.freq, to: freq };
      activity.freq = freq;
    }
    if (energy !== undefined && energy !== activity.energy) {
      changes.energy = { from: activity.energy, to: energy };
      activity.energy = energy;
    }

    if (Object.keys(changes).length > 0) {
      const entry: EditEntry = { editedBy, editedAt: new Date(), changes };
      activity.editHistory.push(entry);
      activity.updatedAt = new Date();
    }

    io.to(`session:${req.params.id}`).emit('activity:updated', { activity });
    res.json({ activity });
  });

  app.delete('/api/sessions/:id/activities/:actId', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'session not found' });

    const token = req.query.token as string | undefined;
    if (token !== session.facilitatorToken)
      return void res.status(403).json({ error: 'facilitator token required' });

    const activity = state.activities.get(req.params.actId);
    if (!activity || activity.sessionId !== req.params.id)
      return void res.status(404).json({ error: 'activity not found' });

    state.activities.delete(req.params.actId);
    io.to(`session:${req.params.id}`).emit('activity:removed', {
      activityId: req.params.actId,
    });
    res.status(204).send();
  });

  app.post('/api/sessions/:id/activities/:actId/merge', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'session not found' });

    const token = req.query.token as string | undefined;
    if (token !== session.facilitatorToken)
      return void res.status(403).json({ error: 'facilitator token required' });

    const source = state.activities.get(req.params.actId);
    const target = source && state.activities.get(req.body.targetId);
    if (!source || source.sessionId !== req.params.id)
      return void res.status(404).json({ error: 'source activity not found' });
    if (!target || target.sessionId !== req.params.id)
      return void res.status(404).json({ error: 'target activity not found' });

    const merged: Activity = {
      id: genId(10),
      sessionId: req.params.id,
      participantId: source.participantId,
      contributorIds: [...new Set([...source.contributorIds, ...target.contributorIds])],
      title: source.title,
      tpo: source.tpo,
      freq: source.freq,
      energy: source.energy,
      teamAuto:
        source.teamAuto !== 'unclassified' ? source.teamAuto : target.teamAuto,
      flaggedByFacilitator:
        source.flaggedByFacilitator || target.flaggedByFacilitator,
      mergedFrom: [
        source.id,
        target.id,
        ...(source.mergedFrom ?? []),
        ...(target.mergedFrom ?? []),
      ],
      editHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    state.activities.set(merged.id, merged);
    state.activities.delete(source.id);
    state.activities.delete(target.id);
    io.to(`session:${req.params.id}`).emit('activity:merged', {
      merged,
      removedIds: [source.id, target.id],
    });
    res.json({ merged });
  });

  app.patch('/api/sessions/:id/activities/:actId/classify', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'session not found' });

    const token = req.query.token as string | undefined;
    if (token !== session.facilitatorToken)
      return void res.status(403).json({ error: 'facilitator token required' });

    const activity = state.activities.get(req.params.actId);
    if (!activity || activity.sessionId !== req.params.id)
      return void res.status(404).json({ error: 'activity not found' });

    activity.teamAuto = req.body.teamAuto;
    activity.updatedAt = new Date();
    io.to(`session:${req.params.id}`).emit('activity:classified', {
      activityId: activity.id,
      teamAuto: activity.teamAuto,
    });
    res.json({ activity });
  });

  app.patch('/api/sessions/:id/activities/:actId/flag', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'session not found' });

    const token = req.query.token as string | undefined;
    if (token !== session.facilitatorToken)
      return void res.status(403).json({ error: 'facilitator token required' });

    const activity = state.activities.get(req.params.actId);
    if (!activity || activity.sessionId !== req.params.id)
      return void res.status(404).json({ error: 'activity not found' });

    activity.flaggedByFacilitator = req.body.flagged;
    activity.updatedAt = new Date();
    io.to(`session:${req.params.id}`).emit('activity:flagged', {
      activityId: activity.id,
      flagged: activity.flaggedByFacilitator,
    });
    res.json({ activity });
  });

  // ── Session control ─────────────────────────────────────────────────────────

  app.patch('/api/sessions/:id/status', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'session not found' });

    const token = req.query.token as string | undefined;
    if (token !== session.facilitatorToken)
      return void res.status(403).json({ error: 'facilitator token required' });

    session.status = req.body.status;
    io.to(`session:${req.params.id}`).emit('session:statusChanged', {
      status: session.status,
    });
    res.json({ session });
  });

  app.patch('/api/sessions/:id/submission-window', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'session not found' });

    const token = req.query.token as string | undefined;
    if (token !== session.facilitatorToken)
      return void res.status(403).json({ error: 'facilitator token required' });

    const { endsAt } = req.body;
    session.submissionEndsAt = endsAt ? new Date(endsAt) : null;
    io.to(`session:${req.params.id}`).emit('session:windowUpdated', {
      submissionEndsAt: endsAt ?? null,
    });
    res.json({ session });
  });

  app.get('/api/sessions/:id/export', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'session not found' });

    const token = req.query.token as string | undefined;
    if (token !== session.facilitatorToken)
      return void res.status(403).json({ error: 'facilitator token required' });

    const flagged = Array.from(state.activities.values()).filter(
      (a) => a.sessionId === req.params.id && a.flaggedByFacilitator
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

    res.type('text/markdown').send(md);
  });

  // ── MCP ─────────────────────────────────────────────────────────────────────

  setupMCP(app, io);

  // ── Next.js catch-all — must be last ────────────────────────────────────────

  app.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  // ── Socket.io ───────────────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    socket.on('join:session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
