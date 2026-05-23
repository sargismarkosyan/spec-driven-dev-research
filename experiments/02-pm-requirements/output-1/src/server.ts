import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP } from './mcp';
import state from './store';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3020', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Create HTTP server and io early so REST routes can emit events.
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  // ── REST API ───────────────────────────────────────────────────────────────

  app.post('/api/sessions', (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }
    const session = { id: crypto.randomUUID(), name: name.trim(), createdAt: new Date() };
    state.sessions.set(session.id, session);
    res.json(session);
  });

  app.get('/api/sessions/:id', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'session not found' }); return; }
    const activities = state.activities.filter((a) => a.sessionId === req.params.id);
    const users = Array.from(state.users.values()).filter((u) => u.sessionId === req.params.id);
    res.json({ session, activities, users });
  });

  app.patch('/api/activities/:id/flag', (req, res) => {
    const activity = state.activities.find((a) => a.id === req.params.id);
    if (!activity) { res.status(404).json({ error: 'activity not found' }); return; }
    activity.flagged = !activity.flagged;
    io.to(activity.sessionId).emit('activity:flagged', {
      activityId: activity.id,
      flagged: activity.flagged,
    });
    res.json(activity);
  });

  app.get('/api/sessions/:id/export', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'session not found' }); return; }
    const flagged = state.activities.filter((a) => a.sessionId === req.params.id && a.flagged);
    res
      .setHeader('Content-Disposition', `attachment; filename="toil-${req.params.id}-flagged.json"`)
      .json({ session: session.name, exportedAt: new Date(), activities: flagged });
  });

  // ── MCP ────────────────────────────────────────────────────────────────────

  setupMCP(app);

  // ── Next.js (catch-all — must be last) ────────────────────────────────────

  app.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  // ── Socket.io ─────────────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    let currentUser: { id: string; name: string; sessionId: string } | null = null;

    // Engineers join as participants — tracked in users list.
    socket.on('session:join', ({ sessionId, name }: { sessionId: string; name: string }) => {
      const session = state.sessions.get(sessionId);
      if (!session) { socket.emit('error', 'session not found'); return; }

      const user = { id: socket.id, name, sessionId, joinedAt: new Date() };
      state.users.set(socket.id, user);
      currentUser = { id: socket.id, name, sessionId };

      socket.join(sessionId);

      const activities = state.activities.filter((a) => a.sessionId === sessionId);
      const users = Array.from(state.users.values()).filter((u) => u.sessionId === sessionId);
      socket.emit('session:state', { session, activities, users });
      socket.to(sessionId).emit('user:joined', { id: socket.id, name, sessionId });
    });

    // Facilitators observe a session room without registering as a participant.
    socket.on('session:observe', ({ sessionId }: { sessionId: string }) => {
      socket.join(sessionId);
    });

    socket.on('activity:add', (data: {
      sessionId: string;
      title: string;
      timeEstimate: string;
      enjoyment: string;
      repetitiveness: string;
      automationPotential: string;
    }) => {
      if (!currentUser) return;
      const activity = {
        id: crypto.randomUUID(),
        sessionId: data.sessionId,
        authorId: currentUser.id,
        authorName: currentUser.name,
        title: data.title,
        timeEstimate: data.timeEstimate as any,
        enjoyment: data.enjoyment as any,
        repetitiveness: data.repetitiveness as any,
        automationPotential: data.automationPotential as any,
        flagged: false,
        createdAt: new Date(),
      };
      state.activities.push(activity);
      io.to(data.sessionId).emit('activity:added', activity);
    });

    socket.on('disconnect', () => {
      if (currentUser) {
        state.users.delete(currentUser.id);
        io.to(currentUser.sessionId).emit('user:left', currentUser.id);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
