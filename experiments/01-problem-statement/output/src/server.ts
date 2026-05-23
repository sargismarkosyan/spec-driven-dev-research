import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP } from './mcp';
import state from './store';
import type { Role, Energy, Verdict, Activity } from './store';

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

  app.post('/api/sessions', (req, res) => {
    const { facilitatorName } = req.body as { facilitatorName: string };
    if (!facilitatorName?.trim()) { res.status(400).json({ error: 'facilitatorName required' }); return; }
    const id = crypto.randomUUID();
    state.sessions.set(id, {
      id,
      facilitatorId: '',
      phase: 'lobby',
      createdAt: new Date(),
    });
    res.json({ id });
  });

  app.get('/api/sessions/:id', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    const activities = state.activities.filter(a => a.sessionId === req.params.id);
    const participants = Array.from(state.participants.values()).filter(p => p.sessionId === req.params.id);
    res.json({ session, activities, participants });
  });

  app.get('/api/sessions/:id/export', (req, res) => {
    const session = state.sessions.get(req.params.id);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    const activities = state.activities.filter(a => a.sessionId === req.params.id);
    const flagged = activities.filter(a => a.flagged).sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);
    const all = activities.sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);

    let md = `# Toil Tracker — Session Export\n\n`;
    md += `**Session ID:** ${session.id}  \n`;
    md += `**Date:** ${session.createdAt.toISOString().split('T')[0]}  \n`;
    md += `**Total activities logged:** ${activities.length}  \n\n`;

    md += `## Flagged Priority Items\n\n`;
    if (flagged.length === 0) {
      md += `_No items flagged._\n\n`;
    } else {
      for (const a of flagged) {
        const authors = a.mergedAuthorNames.length > 0
          ? [a.authorName, ...a.mergedAuthorNames].join(', ')
          : a.authorName;
        md += `### ${a.description}\n`;
        md += `- **Authors:** ${authors}\n`;
        md += `- **Weekly cost:** ${a.weeklyMinutes} min/week (${a.durationMinutes} min × ${a.frequencyPerWeek}×/week)\n`;
        md += `- **Energy:** ${a.energy}\n`;
        if (a.verdict) md += `- **Verdict:** ${a.verdict}\n`;
        md += `\n`;
      }
    }

    md += `## All Activities\n\n`;
    for (const a of all) {
      const flag = a.flagged ? ' ⚑' : '';
      md += `- **${a.description}**${flag} — ${a.weeklyMinutes} min/week, ${a.energy}`;
      if (a.verdict) md += `, verdict: ${a.verdict}`;
      md += `\n`;
    }

    res.setHeader('Content-Type', 'text/plain');
    res.send(md);
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
    let currentUser: { id: string; name: string; sessionId: string; role: Role } | null = null;

    socket.on('join', ({ name, sessionId, role }: { name: string; sessionId: string; role: Role }) => {
      const session = state.sessions.get(sessionId);
      if (!session) { socket.emit('error', 'Session not found'); return; }

      const participant = { id: socket.id, name, role, sessionId, joinedAt: new Date() };
      state.participants.set(socket.id, participant);
      currentUser = { id: socket.id, name, sessionId, role };

      if (role === 'facilitator' && !session.facilitatorId) {
        session.facilitatorId = socket.id;
      }

      socket.join(sessionId);

      const activities = state.activities.filter(a => a.sessionId === sessionId);
      const participants = Array.from(state.participants.values()).filter(p => p.sessionId === sessionId);
      socket.emit('state', { session, activities, participants });
      socket.to(sessionId).emit('user:joined', participant);
    });

    socket.on('activity:add', ({ description, durationMinutes, frequencyPerWeek, energy }:
      { description: string; durationMinutes: number; frequencyPerWeek: number; energy: Energy }) => {
      if (!currentUser) return;
      const session = state.sessions.get(currentUser.sessionId);
      if (!session || session.phase !== 'input') return;

      const activity: Activity = {
        id: crypto.randomUUID(),
        sessionId: currentUser.sessionId,
        authorId: currentUser.id,
        authorName: currentUser.name,
        description: description.trim(),
        durationMinutes,
        frequencyPerWeek,
        weeklyMinutes: durationMinutes * frequencyPerWeek,
        energy,
        flagged: false,
        mergedFromIds: [],
        mergedAuthorNames: [],
        createdAt: new Date(),
      };
      state.activities.push(activity);
      io.to(currentUser.sessionId).emit('activity:added', activity);
    });

    socket.on('activity:update', ({ id, description, verdict, flagged }:
      { id: string; description?: string; verdict?: Verdict; flagged?: boolean }) => {
      if (!currentUser || currentUser.role !== 'facilitator') return;
      const activity = state.activities.find(a => a.id === id && a.sessionId === currentUser!.sessionId);
      if (!activity) return;
      if (description !== undefined) activity.description = description.trim();
      if (verdict !== undefined) activity.verdict = verdict;
      if (flagged !== undefined) activity.flagged = flagged;
      io.to(currentUser.sessionId).emit('activity:updated', activity);
    });

    socket.on('activity:delete', (id: string) => {
      if (!currentUser || currentUser.role !== 'facilitator') return;
      const idx = state.activities.findIndex(a => a.id === id && a.sessionId === currentUser!.sessionId);
      if (idx === -1) return;
      state.activities.splice(idx, 1);
      io.to(currentUser.sessionId).emit('activity:deleted', id);
    });

    socket.on('activity:merge', ({ keepId, removeId }: { keepId: string; removeId: string }) => {
      if (!currentUser || currentUser.role !== 'facilitator') return;
      const keep = state.activities.find(a => a.id === keepId && a.sessionId === currentUser!.sessionId);
      const remove = state.activities.find(a => a.id === removeId && a.sessionId === currentUser!.sessionId);
      if (!keep || !remove) return;

      keep.weeklyMinutes += remove.weeklyMinutes;
      keep.mergedFromIds = [...keep.mergedFromIds, remove.id, ...remove.mergedFromIds];
      keep.mergedAuthorNames = [
        ...keep.mergedAuthorNames,
        remove.authorName,
        ...remove.mergedAuthorNames,
      ].filter((n, i, arr) => arr.indexOf(n) === i && n !== keep.authorName);

      const removeIdx = state.activities.findIndex(a => a.id === removeId);
      state.activities.splice(removeIdx, 1);

      io.to(currentUser.sessionId).emit('activity:merged', { merged: keep, removedIds: [removeId] });
    });

    socket.on('session:advance', () => {
      if (!currentUser || currentUser.role !== 'facilitator') return;
      const session = state.sessions.get(currentUser.sessionId);
      if (!session) return;
      const phases: Array<typeof session.phase> = ['lobby', 'input', 'discussion', 'closed'];
      const idx = phases.indexOf(session.phase);
      if (idx < phases.length - 1) {
        session.phase = phases[idx + 1];
        io.to(currentUser.sessionId).emit('session:phase', session.phase);
      }
    });

    socket.on('disconnect', () => {
      if (currentUser) {
        state.participants.delete(currentUser.id);
        io.to(currentUser.sessionId).emit('user:left', currentUser.id);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
