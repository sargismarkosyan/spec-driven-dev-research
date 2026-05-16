import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import state from './store';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// ── REST API ──────────────────────────────────────────────────────────────────

app.get('/api/state', (_req, res) => {
  res.json({
    users: Array.from(state.users.values()),
    notes: state.notes,
  });
});

// Add your domain routes here

// ── WebSocket ─────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  let currentUser: { id: string; name: string } | null = null;

  socket.on('join', (name: string) => {
    const user = { id: socket.id, name, joinedAt: new Date() };
    state.users.set(socket.id, user);
    currentUser = { id: socket.id, name };

    // Send full current state to the joining user
    socket.emit('state', {
      users: Array.from(state.users.values()),
      notes: state.notes,
    });

    // Announce to everyone else
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

  // Add your domain socket events here
});

// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
