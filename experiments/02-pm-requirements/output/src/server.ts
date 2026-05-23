import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP } from './mcp';
import state, {
  Session,
  Participant,
  Activity,
  PromptCategory,
  calcEffort,
  similarityScore,
} from './store';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3020', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

// ── Helpers ────────────────────────────────────────────────────────────────

function sessionToJSON(session: Session) {
  return {
    ...session,
    participants: Array.from(session.participants.values()),
  };
}

function makeJoinUrl(sessionId: string, req: express.Request) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  return `${proto}://${host}/session/${sessionId}/join`;
}

const ALL_CATEGORIES: PromptCategory[] = [
  'yesterday','meetings','rituals','oncall','quarterly','chores','handoffs','automation','other',
];

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── REST API ───────────────────────────────────────────────────────────────

  // Create session
  app.post('/api/sessions', (req, res) => {
    const { name, windowMinutes, enabledCategories, liveFeedEnabled } = req.body as {
      name: string;
      windowMinutes?: number | null;
      enabledCategories?: PromptCategory[];
      liveFeedEnabled?: boolean;
    };
    if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }

    const id = crypto.randomUUID();
    const facilitatorToken = crypto.randomUUID();
    const session: Session = {
      id,
      name: name.trim(),
      facilitatorToken,
      status: 'lobby',
      windowMinutes: windowMinutes ?? null,
      windowStartedAt: null,
      enabledCategories: enabledCategories ?? ALL_CATEGORIES,
      liveFeedEnabled: liveFeedEnabled ?? true,
      participants: new Map(),
      activities: [],
      discussionQueue: [],
      discussionIndex: 0,
      createdAt: new Date(),
    };
    state.sessions.set(id, session);
    res.json({ session: sessionToJSON(session), facilitatorToken });
  });

  // Get session (public info — no token needed)
  app.get('/api/sessions/:id', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'not found' }); return; }
    res.json(sessionToJSON(session));
  });

  // Merge activities
  app.post('/api/sessions/:id/activities/merge', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'not found' }); return; }

    const { sourceId, targetId, preserveAuthors, sumEffort, useSourceMeta } = req.body as {
      sourceId: string;
      targetId: string;
      preserveAuthors?: boolean;
      sumEffort?: boolean;
      useSourceMeta?: boolean;
    };

    const source = session.activities.find((a) => a.id === sourceId);
    const target = session.activities.find((a) => a.id === targetId);
    if (!source || !target) { res.status(404).json({ error: 'activity not found' }); return; }

    const mergedId = crypto.randomUUID();
    const now = new Date();
    const authors = preserveAuthors !== false
      ? [source.authorName, target.authorName].filter((v, i, a) => a.indexOf(v) === i)
      : [source.authorName];

    const effort = sumEffort !== false
      ? source.effortHrsPerWeek + target.effortHrsPerWeek
      : source.effortHrsPerWeek;

    const merged: Activity = {
      id: mergedId,
      sessionId: session.id,
      authorId: source.authorId,
      authorName: authors.join(' + '),
      title: source.title,
      tpo: useSourceMeta !== false ? source.tpo : target.tpo,
      frequency: useSourceMeta !== false ? source.frequency : target.frequency,
      energy: useSourceMeta !== false ? source.energy : target.energy,
      effortHrsPerWeek: Math.round(effort * 100) / 100,
      autoVerdict: source.autoVerdict,
      flagged: source.flagged || target.flagged,
      discussionNote: source.discussionNote,
      editHistory: [],
      createdAt: now,
      updatedAt: now,
      mergedFrom: [sourceId, targetId],
    };

    source.mergedInto = mergedId;
    target.mergedInto = mergedId;
    session.activities = session.activities.filter((a) => a.id !== sourceId && a.id !== targetId);
    session.activities.push(merged);

    res.json({ merged });
    return merged;
  });

  // Treat as related
  app.post('/api/sessions/:id/activities/relate', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'not found' }); return; }
    const { sourceId, targetId } = req.body as { sourceId: string; targetId: string };
    const source = session.activities.find((a) => a.id === sourceId);
    const target = session.activities.find((a) => a.id === targetId);
    if (!source || !target) { res.status(404).json({ error: 'activity not found' }); return; }
    source.relatedTo = [...(source.relatedTo ?? []), targetId];
    target.relatedTo = [...(target.relatedTo ?? []), sourceId];
    res.json({ ok: true });
  });

  // Export flagged activities
  app.get('/api/sessions/:id/export', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'not found' }); return; }
    const flagged = session.activities.filter((a) => a.flagged);
    res.json({ flagged, sessionName: session.name });
  });

  // Similarity candidates for merge
  app.get('/api/sessions/:id/activities/:actId/candidates', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'not found' }); return; }
    const source = session.activities.find((a) => a.id === req.params.actId);
    if (!source) { res.status(404).json({ error: 'activity not found' }); return; }
    const candidates = session.activities
      .filter((a) => a.id !== source.id && !a.mergedInto)
      .map((a) => ({ activity: a, score: similarityScore(source, a) }))
      .sort((a, b) => b.score.total - a.score.total);
    res.json(candidates);
  });

  // ── MCP ────────────────────────────────────────────────────────────────────
  setupMCP(app);

  // ── Next.js (catch-all — must be last) ────────────────────────────────────
  app.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  // ── HTTP + Socket.io ───────────────────────────────────────────────────────
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    let currentSessionId: string | null = null;
    let currentParticipant: Participant | null = null;

    // ── Join session ───────────────────────────────────────────────────────
    socket.on('session:join', (payload: {
      sessionId: string;
      name: string;
      role?: string;
      facilitatorToken?: string;
    }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session) { socket.emit('error', 'session not found'); return; }

      const isFacilitator = !!payload.facilitatorToken &&
        payload.facilitatorToken === session.facilitatorToken;

      const participant: Participant = {
        id: socket.id,
        name: payload.name,
        role: (payload.role as Participant['role']) || 'IC',
        joinedAt: new Date(),
        isFacilitator,
      };

      session.participants.set(socket.id, participant);
      currentSessionId = payload.sessionId;
      currentParticipant = participant;
      socket.join(payload.sessionId);

      // Send full state to joining client
      socket.emit('session:state', sessionToJSON(session));
      // Notify others
      socket.to(payload.sessionId).emit('session:participant_joined', participant);
    });

    // ── Add activity ───────────────────────────────────────────────────────
    socket.on('activity:add', (payload: {
      sessionId: string;
      title: string;
      tpo: Activity['tpo'];
      frequency: Activity['frequency'];
      energy: Activity['energy'];
    }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session || !currentParticipant) return;

      const activity: Activity = {
        id: crypto.randomUUID(),
        sessionId: payload.sessionId,
        authorId: currentParticipant.id,
        authorName: currentParticipant.name,
        title: payload.title,
        tpo: payload.tpo,
        frequency: payload.frequency,
        energy: payload.energy,
        effortHrsPerWeek: calcEffort(payload.tpo, payload.frequency),
        autoVerdict: null,
        flagged: false,
        discussionNote: '',
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      session.activities.push(activity);
      io.to(payload.sessionId).emit('activity:added', activity);
    });

    // ── Edit activity ──────────────────────────────────────────────────────
    socket.on('activity:edit', (payload: {
      sessionId: string;
      activityId: string;
      changes: Partial<Pick<Activity, 'title' | 'tpo' | 'frequency' | 'energy' | 'autoVerdict' | 'discussionNote' | 'flagged'>>;
    }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session || !currentParticipant) return;
      const activity = session.activities.find((a) => a.id === payload.activityId);
      if (!activity) return;

      const historyEntries: Activity['editHistory'] = [];
      const changes = payload.changes;

      for (const [field, newVal] of Object.entries(changes) as [keyof typeof changes, unknown][]) {
        const oldVal = activity[field as keyof Activity];
        if (oldVal !== newVal) {
          historyEntries.push({
            editedBy: currentParticipant.name,
            editedByRole: currentParticipant.isFacilitator ? 'facilitator' : 'participant',
            editedAt: new Date(),
            field,
            from: String(oldVal),
            to: String(newVal),
          });
          (activity as Record<string, unknown>)[field] = newVal;
        }
      }

      if (changes.tpo || changes.frequency) {
        activity.effortHrsPerWeek = calcEffort(activity.tpo, activity.frequency);
      }
      activity.updatedAt = new Date();
      activity.editHistory.push(...historyEntries);

      io.to(payload.sessionId).emit('activity:updated', activity);
    });

    // ── Delete activity ────────────────────────────────────────────────────
    socket.on('activity:delete', (payload: { sessionId: string; activityId: string }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session || !currentParticipant) return;
      const idx = session.activities.findIndex((a) => a.id === payload.activityId);
      if (idx === -1) return;
      const act = session.activities[idx];
      // Only author or facilitator can delete
      if (act.authorId !== currentParticipant.id && !currentParticipant.isFacilitator) return;
      session.activities.splice(idx, 1);
      io.to(payload.sessionId).emit('activity:deleted', payload.activityId);
    });

    // ── Classify activity ──────────────────────────────────────────────────
    socket.on('activity:classify', (payload: {
      sessionId: string;
      activityId: string;
      verdict: Activity['autoVerdict'];
    }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session || !currentParticipant?.isFacilitator) return;
      const activity = session.activities.find((a) => a.id === payload.activityId);
      if (!activity) return;
      activity.autoVerdict = payload.verdict;
      activity.updatedAt = new Date();
      io.to(payload.sessionId).emit('activity:updated', activity);
    });

    // ── Flag activity ──────────────────────────────────────────────────────
    socket.on('activity:flag', (payload: {
      sessionId: string;
      activityId: string;
      flagged: boolean;
    }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session || !currentParticipant?.isFacilitator) return;
      const activity = session.activities.find((a) => a.id === payload.activityId);
      if (!activity) return;
      activity.flagged = payload.flagged;
      activity.updatedAt = new Date();
      io.to(payload.sessionId).emit('activity:updated', activity);
    });

    // ── Session status change ──────────────────────────────────────────────
    socket.on('session:status', (payload: { sessionId: string; status: Session['status'] }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session || !currentParticipant?.isFacilitator) return;
      session.status = payload.status;
      if (payload.status === 'open' && !session.windowStartedAt) {
        session.windowStartedAt = new Date();
        // Build discussion queue
        session.discussionQueue = session.activities.map((a) => a.id);
        session.discussionIndex = 0;
      }
      if (payload.status === 'reviewing') {
        session.discussionQueue = session.activities.map((a) => a.id);
        session.discussionIndex = 0;
      }
      io.to(payload.sessionId).emit('session:status_changed', {
        status: session.status,
        windowStartedAt: session.windowStartedAt,
      });
    });

    // ── Extend window ──────────────────────────────────────────────────────
    socket.on('session:extend_window', (payload: { sessionId: string; minutes: number }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session || !currentParticipant?.isFacilitator) return;
      if (session.windowMinutes !== null) {
        session.windowMinutes += payload.minutes;
      }
      io.to(payload.sessionId).emit('session:window_updated', {
        windowMinutes: session.windowMinutes,
      });
    });

    // ── Discussion navigation ──────────────────────────────────────────────
    socket.on('discussion:navigate', (payload: {
      sessionId: string;
      direction: 'next' | 'prev' | 'skip';
      currentId?: string;
    }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session || !currentParticipant?.isFacilitator) return;
      if (payload.direction === 'prev') {
        session.discussionIndex = Math.max(0, session.discussionIndex - 1);
      } else {
        session.discussionIndex = Math.min(
          session.discussionQueue.length - 1,
          session.discussionIndex + 1
        );
      }
      io.to(payload.sessionId).emit('discussion:index_changed', {
        index: session.discussionIndex,
        currentId: session.discussionQueue[session.discussionIndex],
      });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (currentSessionId && currentParticipant) {
        const session = state.sessions.get(currentSessionId);
        if (session) {
          session.participants.delete(currentParticipant.id);
          io.to(currentSessionId).emit('session:participant_left', currentParticipant.id);
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
