import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP } from './mcp';
import state from './store';
import type { Frequency, Role } from './store';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3010', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── REST API ───────────────────────────────────────────────────────────────

  // Create a new session (facilitator action)
  app.post('/api/sessions', (req, res) => {
    const { name } = req.body as { name: string };
    if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }
    const session = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: new Date(),
      status: 'open' as const,
    };
    state.sessions.set(session.id, session);
    res.json(session);
  });

  // Get session details + participants + activities
  app.get('/api/sessions/:id', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'not found' }); return; }
    const participants = Array.from(state.participants.values()).filter(
      (p) => p.sessionId === req.params.id
    );
    const activities = state.activities.filter((a) => a.sessionId === req.params.id);
    res.json({ session, participants, activities });
  });

  // Close a session (facilitator action)
  app.patch('/api/sessions/:id/close', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'not found' }); return; }
    session.status = 'closed';
    res.json(session);
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
    // session:join — { sessionId, name, role }
    socket.on('session:join', (payload: { sessionId: string; name: string; role: Role }) => {
      const { sessionId, name, role } = payload;
      const session = state.sessions.get(sessionId);
      if (!session) { socket.emit('error', 'session not found'); return; }

      const participant = { socketId: socket.id, name, role, sessionId };
      state.participants.set(socket.id, participant);
      socket.join(sessionId);

      const participants = Array.from(state.participants.values()).filter(
        (p) => p.sessionId === sessionId
      );
      const activities = state.activities.filter((a) => a.sessionId === sessionId);

      socket.emit('session:state', { session, participants, activities });
      socket.to(sessionId).emit('participant:joined', participant);
    });

    // activity:add — { sessionId, description, category, frequency, minutesPerOccurrence, painLevel }
    socket.on('activity:add', (payload: {
      sessionId: string;
      description: string;
      category: string;
      frequency: Frequency;
      minutesPerOccurrence: number;
      painLevel: number;
    }) => {
      const participant = state.participants.get(socket.id);
      if (!participant) return;
      const session = state.sessions.get(payload.sessionId);
      if (!session || session.status === 'closed') return;

      const activity = {
        id: crypto.randomUUID(),
        sessionId: payload.sessionId,
        authorId: socket.id,
        authorName: participant.name,
        description: payload.description,
        category: payload.category,
        frequency: payload.frequency,
        minutesPerOccurrence: payload.minutesPerOccurrence,
        painLevel: Math.min(5, Math.max(1, payload.painLevel)),
        flagged: false,
        createdAt: new Date(),
      };
      state.activities.push(activity);
      io.to(payload.sessionId).emit('activity:added', activity);
    });

    // activity:flag — { activityId } — toggles flag (facilitator action)
    socket.on('activity:flag', (payload: { activityId: string }) => {
      const participant = state.participants.get(socket.id);
      if (!participant || participant.role !== 'facilitator') return;

      const activity = state.activities.find((a) => a.id === payload.activityId);
      if (!activity || activity.sessionId !== participant.sessionId) return;

      activity.flagged = !activity.flagged;
      io.to(participant.sessionId).emit('activity:flagged', {
        activityId: activity.id,
        flagged: activity.flagged,
      });
    });

    // session:close — facilitator closes the session
    socket.on('session:close', (payload: { sessionId: string }) => {
      const participant = state.participants.get(socket.id);
      if (!participant || participant.role !== 'facilitator') return;

      const session = state.sessions.get(payload.sessionId);
      if (!session) return;

      session.status = 'closed';
      io.to(payload.sessionId).emit('session:closed', payload.sessionId);
    });

    socket.on('disconnect', () => {
      const participant = state.participants.get(socket.id);
      if (participant) {
        state.participants.delete(socket.id);
        io.to(participant.sessionId).emit('participant:left', socket.id);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
