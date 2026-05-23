import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP } from './mcp';
import state from './store';
import type { Activity, Duration, Enjoyment, Repetitive, Automatable, Priority, Session } from './store';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3030', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

function serializeSession(session: Session) {
  return {
    id: session.id,
    title: session.title,
    status: session.status,
    createdAt: session.createdAt,
    participants: Array.from(session.participants.values()),
    activities: session.activities,
  };
}

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── REST API ───────────────────────────────────────────────────────────────

  // Legacy canvas endpoint
  app.get('/api/state', (_req, res) => {
    res.json({ users: Array.from(state.users.values()), notes: state.notes });
  });

  // Sessions
  app.post('/api/sessions', (req, res) => {
    const { title } = req.body as { title?: string };
    if (!title?.trim()) {
      res.status(400).json({ error: 'title required' });
      return;
    }
    const session: Session = {
      id: crypto.randomUUID(),
      title: title.trim(),
      status: 'open',
      participants: new Map(),
      activities: [],
      createdAt: new Date(),
    };
    state.sessions.set(session.id, session);
    res.json(serializeSession(session));
  });

  app.get('/api/sessions/:id', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }
    res.json(serializeSession(session));
  });

  app.patch('/api/sessions/:id/status', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }
    const { status } = req.body as { status?: string };
    if (!['open', 'reviewing', 'closed'].includes(status ?? '')) {
      res.status(400).json({ error: 'invalid status' });
      return;
    }
    session.status = status as Session['status'];
    res.json(serializeSession(session));
  });

  app.patch('/api/sessions/:id/activities/:activityId', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }
    const activity = session.activities.find(a => a.id === req.params.activityId);
    if (!activity) {
      res.status(404).json({ error: 'activity not found' });
      return;
    }
    const body = req.body as { priority?: Priority; flagged?: boolean };
    if (body.priority !== undefined) activity.priority = body.priority;
    if (body.flagged !== undefined) activity.flagged = body.flagged;
    res.json(activity);
  });

  app.get('/api/sessions/:id/export', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const prioritized = session.activities
      .filter(a => a.priority)
      .sort((a, b) => (priorityOrder[a.priority!] ?? 3) - (priorityOrder[b.priority!] ?? 3));
    res.json({
      session: { id: session.id, title: session.title, status: session.status },
      activities: prioritized,
    });
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
    // ── Legacy canvas events ─────────────────────────────────────────────────
    let canvasUser: { id: string; name: string } | null = null;

    socket.on('join', (name: string) => {
      const user = { id: socket.id, name, joinedAt: new Date() };
      state.users.set(socket.id, user);
      canvasUser = { id: socket.id, name };
      socket.emit('state', { users: Array.from(state.users.values()), notes: state.notes });
      socket.broadcast.emit('user:joined', user);
    });

    socket.on('note:add', (text: string) => {
      if (!canvasUser) return;
      const note = {
        id: crypto.randomUUID(),
        authorId: canvasUser.id,
        authorName: canvasUser.name,
        text,
        createdAt: new Date(),
      };
      state.notes.push(note);
      io.emit('note:added', note);
    });

    // ── Session events ───────────────────────────────────────────────────────
    let sessionCtx: { sessionId: string; participantId: string } | null = null;

    socket.on('session:join', ({ sessionId, name }: { sessionId: string; name: string }) => {
      const session = state.sessions.get(sessionId);
      if (!session) {
        socket.emit('session:error', 'session not found');
        return;
      }
      const participant = { id: socket.id, name, sessionId, joinedAt: new Date() };
      session.participants.set(socket.id, participant);
      sessionCtx = { sessionId, participantId: socket.id };
      socket.join(sessionId);
      socket.emit('session:state', serializeSession(session));
      socket.to(sessionId).emit('session:participant:joined', { id: socket.id, name });
    });

    socket.on('session:facilitate', ({ sessionId }: { sessionId: string }) => {
      const session = state.sessions.get(sessionId);
      if (!session) {
        socket.emit('session:error', 'session not found');
        return;
      }
      socket.join(sessionId);
      socket.emit('session:state', serializeSession(session));
    });

    socket.on('activity:add', (payload: {
      sessionId: string;
      title: string;
      duration: Duration;
      enjoyment: Enjoyment;
      repetitive: Repetitive;
      automatable: Automatable;
    }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session) return;
      const participant = session.participants.get(socket.id);
      if (!participant) return;

      const activity: Activity = {
        id: crypto.randomUUID(),
        sessionId: payload.sessionId,
        authorId: socket.id,
        authorName: participant.name,
        title: payload.title.trim(),
        duration: payload.duration,
        enjoyment: payload.enjoyment,
        repetitive: payload.repetitive,
        automatable: payload.automatable,
        flagged: false,
        createdAt: new Date(),
      };
      session.activities.push(activity);
      io.to(payload.sessionId).emit('activity:added', activity);
    });

    socket.on('activity:update', (payload: {
      sessionId: string;
      activityId: string;
      priority?: Priority;
      flagged?: boolean;
    }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session) return;
      const activity = session.activities.find(a => a.id === payload.activityId);
      if (!activity) return;
      if (payload.priority !== undefined) activity.priority = payload.priority;
      if (payload.flagged !== undefined) activity.flagged = payload.flagged;
      io.to(payload.sessionId).emit('activity:updated', activity);
    });

    socket.on('session:set_status', (payload: { sessionId: string; status: Session['status'] }) => {
      const session = state.sessions.get(payload.sessionId);
      if (!session) return;
      session.status = payload.status;
      io.to(payload.sessionId).emit('session:updated', { status: payload.status });
    });

    socket.on('disconnect', () => {
      if (canvasUser) {
        state.users.delete(canvasUser.id);
        io.emit('user:left', canvasUser.id);
      }
      if (sessionCtx) {
        const session = state.sessions.get(sessionCtx.sessionId);
        if (session) {
          session.participants.delete(sessionCtx.participantId);
          io.to(sessionCtx.sessionId).emit('session:participant:left', sessionCtx.participantId);
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
