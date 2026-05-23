import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP } from './mcp';
import state, {
  Session,
  Activity,
  Participant,
  ParticipantRole,
  TimePerOccurrence,
  Frequency,
  EnergyLevel,
  AutomatabilityVerdict,
  DEFAULT_PROMPT_CATEGORIES,
} from './store';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3030', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

// Initialized before httpServer.listen; safe to use in REST handlers.
let io: Server;

// Maps socket.id → { sessionId, participantId } for disconnect cleanup
const socketMap = new Map<string, { sessionId: string; participantId: string }>();

function serializeActivity(a: Activity) {
  return { ...a, auditLog: a.auditLog };
}

function serializeSession(session: Session) {
  const activeActivities = Array.from(session.activities.values()).filter(
    (a) => !a.mergedInto
  );
  return {
    id: session.id,
    name: session.name,
    facilitatorId: session.facilitatorId,
    facilitatorName: session.facilitatorName,
    phase: session.phase,
    submissionWindowMinutes: session.submissionWindowMinutes,
    submissionStartedAt: session.submissionStartedAt,
    showTeamFeedToEngineers: session.showTeamFeedToEngineers,
    enabledPromptCategoryIds: session.enabledPromptCategoryIds,
    participants: Array.from(session.participants.values()),
    activities: activeActivities.map(serializeActivity),
    discussionOrder: session.discussionOrder,
    discussionIndex: session.discussionIndex,
    createdAt: session.createdAt,
  };
}

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── REST API ───────────────────────────────────────────────────────────────

  // Create a session (facilitator action)
  app.post('/api/sessions', (req, res) => {
    const {
      name,
      facilitatorName,
      submissionWindowMinutes,
      showTeamFeedToEngineers,
      enabledPromptCategoryIds,
    } = req.body;

    if (!name || !facilitatorName) {
      res.status(400).json({ error: 'name and facilitatorName required' });
      return;
    }

    const id = crypto.randomUUID();
    const facilitatorId = crypto.randomUUID();

    const session: Session = {
      id,
      name,
      facilitatorId,
      facilitatorName,
      phase: 'lobby',
      submissionWindowMinutes: submissionWindowMinutes ?? null,
      submissionStartedAt: null,
      showTeamFeedToEngineers: showTeamFeedToEngineers ?? true,
      enabledPromptCategoryIds:
        enabledPromptCategoryIds ?? DEFAULT_PROMPT_CATEGORIES.map((c) => c.id),
      participants: new Map(),
      activities: new Map(),
      discussionOrder: [],
      discussionIndex: 0,
      createdAt: new Date(),
    };

    state.sessions.set(id, session);
    res.json({ id, facilitatorId });
  });

  // Get a session
  app.get('/api/sessions/:id', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    res.json(serializeSession(session));
  });

  // Change session phase
  app.patch('/api/sessions/:id/phase', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    const { facilitatorId, phase } = req.body;
    if (session.facilitatorId !== facilitatorId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const validTransitions: Record<string, string[]> = {
      lobby: ['submission'],
      submission: ['discussion', 'closed'],
      discussion: ['closed'],
    };
    if (!validTransitions[session.phase]?.includes(phase)) {
      res.status(400).json({ error: `Cannot transition from ${session.phase} to ${phase}` }); return;
    }

    session.phase = phase;

    if (phase === 'submission') {
      session.submissionStartedAt = new Date();
    }

    if (phase === 'discussion') {
      // Build discussion order from all active activities, sorted by effort desc
      session.discussionOrder = Array.from(session.activities.values())
        .filter((a) => !a.mergedInto)
        .sort((a, b) => {
          const ea = a.energy === 'drains' ? 2 : a.energy === 'neutral' ? 1 : 0;
          const eb = b.energy === 'drains' ? 2 : b.energy === 'neutral' ? 1 : 0;
          return eb - ea;
        })
        .map((a) => a.id);
      session.discussionIndex = 0;
    }

    io.to(session.id).emit('session:phase', {
      phase,
      discussionOrder: session.discussionOrder,
      discussionIndex: session.discussionIndex,
      submissionStartedAt: session.submissionStartedAt,
    });

    res.json({ phase });
  });

  // Set discussion index
  app.patch('/api/sessions/:id/discussion', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    const { facilitatorId, index } = req.body;
    if (session.facilitatorId !== facilitatorId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    session.discussionIndex = Math.max(0, Math.min(index, session.discussionOrder.length - 1));
    io.to(session.id).emit('discussion:advanced', { discussionIndex: session.discussionIndex });
    res.json({ discussionIndex: session.discussionIndex });
  });

  // Facilitator: edit any activity
  app.patch('/api/sessions/:id/activities/:actId', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    const activity = session.activities.get(req.params.actId);
    if (!activity) { res.status(404).json({ error: 'Activity not found' }); return; }

    const { facilitatorId, editorName, updates } = req.body;
    if (session.facilitatorId !== facilitatorId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const editableFields = ['title', 'timePerOccurrence', 'frequency', 'energy'] as const;
    for (const field of editableFields) {
      if (updates[field] !== undefined && updates[field] !== (activity as any)[field]) {
        activity.auditLog.push({
          timestamp: new Date(),
          editorId: facilitatorId,
          editorName: editorName || session.facilitatorName,
          field,
          from: String((activity as any)[field]),
          to: String(updates[field]),
        });
        (activity as any)[field] = updates[field];
      }
    }

    io.to(session.id).emit('activity:updated', serializeActivity(activity));
    res.json(serializeActivity(activity));
  });

  // Facilitator: remove an activity
  app.delete('/api/sessions/:id/activities/:actId', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    const { facilitatorId } = req.body;
    if (session.facilitatorId !== facilitatorId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    session.activities.delete(req.params.actId);
    io.to(session.id).emit('activity:removed', { activityId: req.params.actId });
    res.json({ ok: true });
  });

  // Facilitator: merge two activities
  app.post('/api/sessions/:id/activities/merge', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    const { facilitatorId, sourceId, targetId } = req.body;
    if (session.facilitatorId !== facilitatorId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const source = session.activities.get(sourceId);
    const target = session.activities.get(targetId);
    if (!source || !target) {
      res.status(404).json({ error: 'Activity not found' }); return;
    }

    // Merge source into target: combine co-authors, mark source as merged
    if (!target.coAuthors.find((a) => a.id === source.authorId)) {
      target.coAuthors.push({ id: source.authorId, name: source.authorName });
    }
    for (const ca of source.coAuthors) {
      if (!target.coAuthors.find((a) => a.id === ca.id)) {
        target.coAuthors.push(ca);
      }
    }
    target.mergedFrom.push(sourceId);
    source.mergedInto = targetId;

    target.auditLog.push({
      timestamp: new Date(),
      editorId: facilitatorId,
      editorName: session.facilitatorName,
      field: 'merge',
      from: '',
      to: `merged from "${source.title}" by ${source.authorName}`,
    });

    io.to(session.id).emit('activity:merged', {
      sourceId,
      target: serializeActivity(target),
    });
    res.json({ target: serializeActivity(target) });
  });

  // Facilitator: relate two activities (without merging)
  app.post('/api/sessions/:id/activities/:actId/relate', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    const { facilitatorId, relatedId } = req.body;
    if (session.facilitatorId !== facilitatorId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const a = session.activities.get(req.params.actId);
    const b = session.activities.get(relatedId);
    if (!a || !b) { res.status(404).json({ error: 'Activity not found' }); return; }

    if (!a.relatedTo.includes(relatedId)) a.relatedTo.push(relatedId);
    if (!b.relatedTo.includes(req.params.actId)) b.relatedTo.push(req.params.actId);

    io.to(session.id).emit('activity:updated', serializeActivity(a));
    io.to(session.id).emit('activity:updated', serializeActivity(b));
    res.json({ ok: true });
  });

  // Facilitator: set automatability verdict
  app.patch('/api/sessions/:id/activities/:actId/verdict', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    const activity = session.activities.get(req.params.actId);
    if (!activity) { res.status(404).json({ error: 'Activity not found' }); return; }

    const { facilitatorId, automatability, facilitatorNote } = req.body;
    if (session.facilitatorId !== facilitatorId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    activity.automatability = automatability ?? null;
    if (facilitatorNote !== undefined) activity.facilitatorNote = facilitatorNote;
    activity.discussedAt = new Date();

    io.to(session.id).emit('activity:updated', serializeActivity(activity));
    res.json(serializeActivity(activity));
  });

  // Facilitator: toggle flag
  app.patch('/api/sessions/:id/activities/:actId/flag', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    const activity = session.activities.get(req.params.actId);
    if (!activity) { res.status(404).json({ error: 'Activity not found' }); return; }

    const { facilitatorId } = req.body;
    if (session.facilitatorId !== facilitatorId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    activity.flagged = !activity.flagged;
    io.to(session.id).emit('activity:updated', serializeActivity(activity));
    res.json({ flagged: activity.flagged });
  });

  // Get prompt categories
  app.get('/api/prompt-categories', (_req, res) => {
    res.json(DEFAULT_PROMPT_CATEGORIES);
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
  io = new Server(httpServer, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    // Join or rejoin a session
    socket.on(
      'session:join',
      (data: {
        sessionId: string;
        participantId: string;
        name: string;
        role: ParticipantRole;
        isFacilitator?: boolean;
      }) => {
        const { sessionId, participantId, name, role, isFacilitator } = data;
        const session = state.sessions.get(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        if (isFacilitator && participantId !== session.facilitatorId) {
          socket.emit('error', { message: 'Invalid facilitator token' });
          return;
        }

        let participant = session.participants.get(participantId);
        if (!participant) {
          participant = {
            id: participantId,
            socketId: socket.id,
            name,
            role: role || 'IC',
            joinedAt: new Date(),
            isOnline: true,
          };
          session.participants.set(participantId, participant);
        } else {
          participant.socketId = socket.id;
          participant.isOnline = true;
        }

        socketMap.set(socket.id, { sessionId, participantId });
        socket.join(sessionId);

        socket.emit('session:state', serializeSession(session));
        socket.to(sessionId).emit('participant:joined', participant);
      }
    );

    // Engineer: add an activity
    socket.on(
      'activity:add',
      (data: {
        sessionId: string;
        participantId: string;
        title: string;
        timePerOccurrence: TimePerOccurrence;
        frequency: Frequency;
        energy: EnergyLevel;
      }) => {
        const { sessionId, participantId, title, timePerOccurrence, frequency, energy } = data;
        const session = state.sessions.get(sessionId);
        if (!session || session.phase !== 'submission') return;

        const participant = session.participants.get(participantId);
        if (!participant) return;

        const activity: Activity = {
          id: crypto.randomUUID(),
          sessionId,
          authorId: participantId,
          authorName: participant.name,
          coAuthors: [],
          title,
          timePerOccurrence,
          frequency,
          energy,
          automatability: null,
          facilitatorNote: '',
          flagged: false,
          skipped: false,
          mergedInto: null,
          mergedFrom: [],
          relatedTo: [],
          auditLog: [],
          createdAt: new Date(),
          discussedAt: null,
        };

        session.activities.set(activity.id, activity);
        io.to(sessionId).emit('activity:added', serializeActivity(activity));
      }
    );

    // Engineer: edit own activity
    socket.on(
      'activity:edit',
      (data: {
        sessionId: string;
        participantId: string;
        activityId: string;
        updates: Partial<Pick<Activity, 'title' | 'timePerOccurrence' | 'frequency' | 'energy'>>;
      }) => {
        const { sessionId, participantId, activityId, updates } = data;
        const session = state.sessions.get(sessionId);
        if (!session || session.phase !== 'submission') return;

        const activity = session.activities.get(activityId);
        if (!activity || activity.authorId !== participantId) return;

        if (updates.title !== undefined) activity.title = updates.title;
        if (updates.timePerOccurrence !== undefined) activity.timePerOccurrence = updates.timePerOccurrence;
        if (updates.frequency !== undefined) activity.frequency = updates.frequency;
        if (updates.energy !== undefined) activity.energy = updates.energy;

        io.to(sessionId).emit('activity:updated', serializeActivity(activity));
      }
    );

    // Engineer: delete own activity
    socket.on(
      'activity:delete',
      (data: { sessionId: string; participantId: string; activityId: string }) => {
        const { sessionId, participantId, activityId } = data;
        const session = state.sessions.get(sessionId);
        if (!session || session.phase !== 'submission') return;

        const activity = session.activities.get(activityId);
        if (!activity || activity.authorId !== participantId) return;

        session.activities.delete(activityId);
        io.to(sessionId).emit('activity:removed', { activityId });
      }
    );

    socket.on('disconnect', () => {
      const info = socketMap.get(socket.id);
      if (!info) return;
      socketMap.delete(socket.id);

      const session = state.sessions.get(info.sessionId);
      if (!session) return;

      const participant = session.participants.get(info.participantId);
      if (participant) {
        participant.isOnline = false;
        io.to(info.sessionId).emit('participant:left', { participantId: info.participantId });
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
