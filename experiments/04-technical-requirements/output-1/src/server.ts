import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP, setIO } from './mcp';
import state from './store';
import type { Activity, Participant } from './store';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3040', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── REST API ───────────────────────────────────────────────────────────────

  app.post('/api/sessions', (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    const id = crypto.randomUUID();
    const facilitatorToken = crypto.randomUUID();
    state.sessions.set(id, {
      id,
      name: name.trim(),
      createdAt: new Date(),
      facilitatorToken,
      participants: [],
      activities: [],
      status: 'open',
    });
    res.status(201).json({ sessionId: id, facilitatorToken });
  });

  app.get('/api/sessions/:id', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session not found' });
    // Omit facilitatorToken from public response
    const { facilitatorToken: _token, ...safeSession } = session;
    res.json(safeSession);
  });

  app.post('/api/sessions/:id/participants', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session not found' });

    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    const participant: Participant = {
      id: crypto.randomUUID(),
      name: name.trim(),
      sessionId: session.id,
    };
    session.participants.push(participant);
    res.status(201).json(participant);
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

  setIO(io);

  io.on('connection', (socket) => {
    socket.on('session:join', ({ sessionId, participantId }: { sessionId: string; participantId: string }) => {
      const session = state.sessions.get(sessionId);
      if (!session) return;

      socket.join(`session:${sessionId}`);
      const participant = session.participants.find(p => p.id === participantId);
      if (participant) {
        socket.to(`session:${sessionId}`).emit('participant:joined', participant);
      }
    });

    socket.on('activity:add', ({ sessionId, activity }: { sessionId: string; activity: Omit<Activity, 'id' | 'flaggedByFacilitator'> }) => {
      const session = state.sessions.get(sessionId);
      if (!session || session.status !== 'open') return;

      const newActivity: Activity = {
        ...activity,
        id: crypto.randomUUID(),
        flaggedByFacilitator: false,
      };
      session.activities.push(newActivity);
      io.to(`session:${sessionId}`).emit('activity:added', newActivity);
    });

    socket.on('activity:update', ({ sessionId, activityId, participantId, updates }: {
      sessionId: string;
      activityId: string;
      participantId: string;
      updates: Partial<Omit<Activity, 'id' | 'participantId' | 'flaggedByFacilitator'>>;
    }) => {
      const session = state.sessions.get(sessionId);
      if (!session || session.status !== 'open') return;

      const activity = session.activities.find(a => a.id === activityId && a.participantId === participantId);
      if (!activity) return;

      Object.assign(activity, updates);
      io.to(`session:${sessionId}`).emit('activity:updated', activity);
    });

    socket.on('activity:delete', ({ sessionId, activityId, participantId }: { sessionId: string; activityId: string; participantId: string }) => {
      const session = state.sessions.get(sessionId);
      if (!session || session.status !== 'open') return;

      const idx = session.activities.findIndex(a => a.id === activityId && a.participantId === participantId);
      if (idx === -1) return;

      session.activities.splice(idx, 1);
      io.to(`session:${sessionId}`).emit('activity:deleted', activityId);
    });

    socket.on('session:status', ({ sessionId, facilitatorToken, status }: {
      sessionId: string;
      facilitatorToken: string;
      status: 'open' | 'reviewing' | 'closed';
    }) => {
      const session = state.sessions.get(sessionId);
      if (!session || session.facilitatorToken !== facilitatorToken) return;

      session.status = status;
      io.to(`session:${sessionId}`).emit('session:statusChanged', status);
    });

    socket.on('activity:flag', ({ sessionId, facilitatorToken, activityId }: {
      sessionId: string;
      facilitatorToken: string;
      activityId: string;
    }) => {
      const session = state.sessions.get(sessionId);
      if (!session || session.facilitatorToken !== facilitatorToken) return;

      const activity = session.activities.find(a => a.id === activityId);
      if (!activity) return;

      activity.flaggedByFacilitator = !activity.flaggedByFacilitator;
      io.to(`session:${sessionId}`).emit('activity:flagged', { activityId, flagged: activity.flaggedByFacilitator });
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
