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
const port = parseInt(process.env.PORT || '3000', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── REST API ───────────────────────────────────────────────────────────────

  app.get('/api/state', (_req, res) => {
    res.json({
      users: Array.from(state.users.values()),
      notes: state.notes,
    });
  });

  // Add domain routes here

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
    let currentUser: { id: string; name: string } | null = null;

    socket.on('join', (name: string) => {
      const user = { id: socket.id, name, joinedAt: new Date() };
      state.users.set(socket.id, user);
      currentUser = { id: socket.id, name };

      socket.emit('state', {
        users: Array.from(state.users.values()),
        notes: state.notes,
      });
      socket.broadcast.emit('user:joined', user);
    });

    socket.on('note:add', (text: string) => {
      if (!currentUser) return;
      const note = {
        id: crypto.randomUUID(),
        authorId: currentUser.id,
        authorName: currentUser.name,
        text,
        createdAt: new Date(),
      };
      state.notes.push(note);
      io.emit('note:added', note);
    });

    socket.on('disconnect', () => {
      if (currentUser) {
        state.users.delete(currentUser.id);
        io.emit('user:left', currentUser.id);
      }
    });

    // Add domain socket events here
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
