import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP } from './mcp';
import sessions, {
  Session, Activity, Participant,
  AVATAR_COLORS, makeInitials, effortHrsPerWk,
  TPO_HOURS, FREQ_PER_WK,
  Role, TimePerOccurrence, Frequency, Energy,
} from './store';

const ALL_CATEGORY_IDS = [
  'yesterday','weekly-meetings','monthly-rituals','oncall',
  'quarterly','manual-chores','handoffs','automate','other',
];

const dev  = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3050', 10);

const nextApp = next({ dev, hostname, port });
const handle  = nextApp.getRequestHandler();

// ── Helpers ───────────────────────────────────────────────────────────────────

function sessionJSON(session: Session) {
  return {
    ...session,
    participants: Array.from(session.participants.values()),
    activities:   Array.from(session.activities.values()),
  };
}

function pickColor(session: Session): string {
  const used = new Set(Array.from(session.participants.values()).map(p => p.color));
  return AVATAR_COLORS.find(c => !used.has(c)) ?? AVATAR_COLORS[session.participants.size % AVATAR_COLORS.length];
}

function buildMarkdownExport(session: Session): string {
  const ENERGY_COST: Record<string, number> = {
    draining: 2.0, tedious: 1.5, fine: 1.0, energizing: 0.5,
  };

  const perceivedCost = (a: Activity): number =>
    TPO_HOURS[a.tpo as TimePerOccurrence] *
    FREQ_PER_WK[a.freq as Frequency] *
    (ENERGY_COST[a.energy] ?? 1.0);

  // Sort: flagged first within group, then by perceived cost descending
  const sortSection = (arr: Activity[]): Activity[] => [
    ...arr.filter(a => a.flagged).sort((a, b) => perceivedCost(b) - perceivedCost(a)),
    ...arr.filter(a => !a.flagged).sort((a, b) => perceivedCost(b) - perceivedCost(a)),
  ];

  const acts = Array.from(session.activities.values());
  const automatable = sortSection(acts.filter(a => a.teamAuto === 'yes'));
  const investigate  = sortSection(acts.filter(a => a.teamAuto === 'maybe'));
  const manual       = acts.filter(a => a.teamAuto === 'no');

  const recoverableHrs = [...automatable, ...investigate]
    .reduce((sum, a) => sum + perceivedCost(a), 0);

  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const fmtActivity = (a: Activity, rank: number): string => {
    const cost = perceivedCost(a).toFixed(1);
    const lines: string[] = [
      `### ${rank}. ${a.title}`,
      `- **Who:** ${a.participantName}`,
      `- **Effort:** ${tpoLabel(a.tpo)} · ${a.freq} · ~${cost} perceived h/wk`,
      `- **Energy:** ${a.energy}`,
    ];
    if (a.discussionNote) lines.push(`- **Note:** ${a.discussionNote}`);
    if (a.flagged) lines.push(`- ⭐ **Flagged priority**`);
    return lines.join('\n');
  };

  const renderSection = (items: Activity[]): string[] =>
    items.length === 0
      ? ['_None_', '']
      : items.flatMap((a, i) => [fmtActivity(a, i + 1), '']);

  const lines: string[] = [
    `# Work Audit — ${session.name}`,
    date,
    '',
    `**${automatable.length} to automate · ${investigate.length} to investigate · ${manual.length} manual**`,
    `Estimated ~${recoverableHrs.toFixed(1)} perceived h/wk recoverable.`,
    '',
    `## 🔧 Automate — act now`,
    '',
    ...renderSection(automatable),
    `## 🔍 Investigate — research spike needed`,
    '',
    ...renderSection(investigate),
    `## ✓ Manual — acknowledged, no action this quarter`,
    '',
    ...renderSection(manual),
    '---',
    '_Automatability was tagged during the discussion phase — team consensus, not self-report._',
  ];

  return lines.join('\n');
}

function tpoLabel(tpo: TimePerOccurrence): string {
  return { '<30m': '< 30 min', '30m-2h': '30 min – 2 hrs', 'half-day': 'Half day', 'day+': 'A full day or more' }[tpo];
}

// ── App setup ─────────────────────────────────────────────────────────────────

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── REST API ───────────────────────────────────────────────────────────────

  // Create session (facilitator)
  app.post('/api/sessions', (req, res) => {
    const { name, facilitatorName = 'Facilitator', submissionWindowMin = 10, liveTeamFeed = true, recallPrompts, enabledCategories } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const id    = crypto.randomUUID().slice(0, 8);
    const token = crypto.randomUUID();
    const session: Session = {
      id, name,
      facilitatorId: '',     // set when facilitator connects via socket
      facilitatorName,
      facilitatorToken: token,
      status: 'lobby',
      submissionWindowMin,
      liveTeamFeed,
      recallPrompts: recallPrompts ?? DEFAULT_PROMPTS,
      enabledCategories: enabledCategories ?? ALL_CATEGORY_IDS,
      createdAt: new Date(),
      participants: new Map(),
      activities:   new Map(),
    };
    sessions.set(id, session);
    return res.json({ id, token, url: `http://${hostname}:${port}/session/${id}/join` });
  });

  // Get session state
  app.get('/api/sessions/:id', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    return res.json(sessionJSON(session));
  });

  // Start submissions (facilitator)
  app.post('/api/sessions/:id/start', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (req.body.token !== session.facilitatorToken) return res.status(403).json({ error: 'forbidden' });
    session.status    = 'active';
    session.startedAt = new Date();
    io.to(req.params.id).emit('session:status', { status: 'active', startedAt: session.startedAt });
    return res.json({ ok: true });
  });

  // Extend time
  app.post('/api/sessions/:id/extend', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (req.body.token !== session.facilitatorToken) return res.status(403).json({ error: 'forbidden' });
    session.submissionWindowMin += (req.body.addMinutes ?? 2);
    io.to(req.params.id).emit('session:extended', { submissionWindowMin: session.submissionWindowMin });
    return res.json({ ok: true });
  });

  // Close submissions → open discussion
  app.post('/api/sessions/:id/close', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (req.body.token !== session.facilitatorToken) return res.status(403).json({ error: 'forbidden' });
    session.status   = 'discussion';
    session.closedAt = new Date();
    io.to(req.params.id).emit('session:status', { status: 'discussion' });
    return res.json({ ok: true });
  });

  // Add activity (engineer)
  app.post('/api/sessions/:id/activities', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (session.status !== 'active') return res.status(400).json({ error: 'submissions not open' });

    const { participantId, title, tpo, freq, energy } = req.body;
    if (!participantId || !title) return res.status(400).json({ error: 'participantId and title required' });

    const participant = session.participants.get(participantId);
    if (!participant) return res.status(400).json({ error: 'participant not found' });

    const activity: Activity = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      participantId,
      participantName: participant.name,
      participantInitials: participant.initials,
      participantColor: participant.color,
      title, tpo, freq, energy,
      teamAuto: 'unclassified',
      flagged: false,
      discussionNote: '',
      createdAt: new Date(),
      editHistory: [{ who: participant.name, what: 'created', at: new Date() }],
    };
    session.activities.set(activity.id, activity);

    io.to(req.params.id).emit('activity:added', activity);
    return res.json(activity);
  });

  // Update activity (engineer updates own, facilitator can update any)
  app.put('/api/sessions/:id/activities/:aid', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    const activity = session.activities.get(req.params.aid);
    if (!activity) return res.status(404).json({ error: 'activity not found' });

    const { participantId, token, title, tpo, freq, energy } = req.body;
    const isFacilitator = token === session.facilitatorToken;
    const isOwner = participantId === activity.participantId;
    if (!isFacilitator && !isOwner) return res.status(403).json({ error: 'forbidden' });

    const editor = isFacilitator ? session.facilitatorName : activity.participantName;
    if (title  !== undefined) activity.title  = title;
    if (tpo    !== undefined) activity.tpo    = tpo;
    if (freq   !== undefined) activity.freq   = freq;
    if (energy !== undefined) activity.energy = energy;
    if (isFacilitator) activity.editedBy = session.facilitatorName;
    activity.editHistory.push({ who: editor, what: 'updated', at: new Date() });

    io.to(req.params.id).emit('activity:updated', activity);
    return res.json(activity);
  });

  // Delete activity
  app.delete('/api/sessions/:id/activities/:aid', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    const activity = session.activities.get(req.params.aid);
    if (!activity) return res.status(404).json({ error: 'activity not found' });

    const { participantId, token } = req.body;
    const isFacilitator = token === session.facilitatorToken;
    const isOwner = participantId === activity.participantId;
    if (!isFacilitator && !isOwner) return res.status(403).json({ error: 'forbidden' });

    session.activities.delete(req.params.aid);
    io.to(req.params.id).emit('activity:deleted', { id: req.params.aid });
    return res.json({ ok: true });
  });

  // Classify activity (team verdict — facilitator during discussion)
  app.post('/api/sessions/:id/activities/:aid/classify', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (req.body.token !== session.facilitatorToken) return res.status(403).json({ error: 'forbidden' });
    const activity = session.activities.get(req.params.aid);
    if (!activity) return res.status(404).json({ error: 'activity not found' });

    activity.teamAuto = req.body.verdict;
    activity.editHistory.push({ who: session.facilitatorName, what: `tagged automatable → ${req.body.verdict}`, at: new Date() });

    io.to(req.params.id).emit('activity:updated', activity);
    return res.json(activity);
  });

  // Flag/unflag activity
  app.post('/api/sessions/:id/activities/:aid/flag', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (req.body.token !== session.facilitatorToken) return res.status(403).json({ error: 'forbidden' });
    const activity = session.activities.get(req.params.aid);
    if (!activity) return res.status(404).json({ error: 'activity not found' });

    activity.flagged = req.body.flagged ?? !activity.flagged;
    if (req.body.note !== undefined) activity.discussionNote = req.body.note;
    activity.editHistory.push({ who: session.facilitatorName, what: activity.flagged ? 'flagged' : 'unflagged', at: new Date() });

    io.to(req.params.id).emit('activity:updated', activity);
    return res.json(activity);
  });

  // Set discussion note
  app.post('/api/sessions/:id/activities/:aid/note', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (req.body.token !== session.facilitatorToken) return res.status(403).json({ error: 'forbidden' });
    const activity = session.activities.get(req.params.aid);
    if (!activity) return res.status(404).json({ error: 'activity not found' });

    activity.discussionNote = req.body.note ?? '';
    io.to(req.params.id).emit('activity:updated', activity);
    return res.json(activity);
  });

  // Export
  app.get('/api/sessions/:id/export', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    const markdown = buildMarkdownExport(session);
    return res.json({ markdown, filename: `${session.id}-audit.md` });
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
    let currentParticipantId: string | null = null;

    // Engineer or facilitator joins a session room
    socket.on('join-session', (data: {
      sessionId: string; name: string; role: Role; isFacilitator?: boolean; token?: string;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session) {
        console.warn('[join-session] session not found — likely wiped on server restart', {
          sessionId: data.sessionId, name: data.name, socketId: socket.id,
        });
        socket.emit('error', `session not found: ${data.sessionId} (server may have restarted — return to home and create a new session)`);
        return;
      }
      console.log('[join-session]', { sessionId: data.sessionId, name: data.name, socketId: socket.id });

      currentSessionId = data.sessionId;
      socket.join(data.sessionId);

      if (data.isFacilitator && data.token === session.facilitatorToken) {
        session.facilitatorId = socket.id;
        currentParticipantId = socket.id;
      } else {
        // Identify participants by name within a session. socket.id changes on
        // every browser reload, so we re-bind any existing participant record
        // (or revive an orphaned one whose disconnect already fired) and
        // re-target their activities to the new socket.id. Without this,
        // activity:update / activity:delete fail the ownership check silently
        // after any reconnect — edits and deletes get dropped on the floor.
        let participant = [...session.participants.values()]
          .find(p => p.name === data.name);

        if (participant) {
          if (participant.id !== socket.id) {
            const oldId = participant.id;
            session.participants.delete(oldId);
            participant.id = socket.id;
            session.participants.set(socket.id, participant);
            // Tell other clients to drop the dead-socket entry; the new id is
            // emitted as participant:joined below.
            socket.broadcast.to(data.sessionId).emit('participant:left', { id: oldId });
          }
        } else {
          // Disconnect already removed the participant from the map. Recover
          // identity (color/initials) from orphan activities if any exist.
          const orphan = [...session.activities.values()]
            .find(a => a.participantName === data.name);
          participant = {
            id: socket.id,
            name: data.name,
            role: data.role ?? 'IC',
            joinedAt: new Date(),
            color: orphan?.participantColor ?? pickColor(session),
            initials: orphan?.participantInitials ?? makeInitials(data.name),
            isFacilitator: false,
          };
          session.participants.set(socket.id, participant);
        }

        // Re-target every activity authored by this name to the current
        // socket.id so isOwner checks keep passing after reconnect.
        for (const a of session.activities.values()) {
          if (a.participantName === data.name) a.participantId = socket.id;
        }

        currentParticipantId = socket.id;
        socket.broadcast.to(data.sessionId).emit('participant:joined', participant);
      }

      // Send full current state to the new joiner
      socket.emit('session:state', sessionJSON(session));
    });

    // Activity events from engineers
    socket.on('activity:add', (data: {
      sessionId: string; title: string; tpo: TimePerOccurrence; freq: Frequency; energy: Energy;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session || !currentParticipantId) return;
      const participant = session.participants.get(currentParticipantId);
      if (!participant) return;
      if (session.status !== 'active') return;

      const activity: Activity = {
        id: crypto.randomUUID(),
        sessionId: data.sessionId,
        participantId: currentParticipantId,
        participantName: participant.name,
        participantInitials: participant.initials,
        participantColor: participant.color,
        title: data.title, tpo: data.tpo, freq: data.freq, energy: data.energy,
        teamAuto: 'unclassified',
        flagged: false,
        discussionNote: '',
        createdAt: new Date(),
        editHistory: [{ who: participant.name, what: 'created', at: new Date() }],
      };
      session.activities.set(activity.id, activity);
      io.to(data.sessionId).emit('activity:added', activity);
    });

    socket.on('activity:update', (data: {
      sessionId: string; activityId: string;
      title?: string; tpo?: TimePerOccurrence; freq?: Frequency; energy?: Energy;
      token?: string;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session) {
        console.warn('[activity:update] session not found', { sessionId: data.sessionId, socketId: socket.id });
        socket.emit('error', `session not found: ${data.sessionId}`);
        return;
      }
      const activity = session.activities.get(data.activityId);
      if (!activity) {
        console.warn('[activity:update] activity not found', { sessionId: data.sessionId, activityId: data.activityId });
        socket.emit('error', `activity not found: ${data.activityId}`);
        return;
      }

      const isFac = data.token === session.facilitatorToken;
      const isOwner = currentParticipantId === activity.participantId;
      if (!isFac && !isOwner) {
        console.warn('[activity:update] ownership check failed', {
          sessionId: data.sessionId,
          activityId: data.activityId,
          currentParticipantId,
          activityParticipantId: activity.participantId,
          activityParticipantName: activity.participantName,
        });
        socket.emit('error', 'edit blocked: not your activity (try refreshing)');
        return;
      }
      console.log('[activity:update] OK', {
        activityId: data.activityId,
        patch: { title: data.title, tpo: data.tpo, freq: data.freq, energy: data.energy },
      });

      if (data.title  !== undefined) activity.title  = data.title;
      if (data.tpo    !== undefined) activity.tpo    = data.tpo;
      if (data.freq   !== undefined) activity.freq   = data.freq;
      if (data.energy !== undefined) activity.energy = data.energy;
      const editor = isFac ? session.facilitatorName : activity.participantName;
      if (isFac) activity.editedBy = session.facilitatorName;
      activity.editHistory.push({ who: editor, what: 'updated', at: new Date() });

      io.to(data.sessionId).emit('activity:updated', activity);
    });

    socket.on('activity:delete', (data: { sessionId: string; activityId: string; token?: string }) => {
      const session = sessions.get(data.sessionId);
      if (!session) return;
      const activity = session.activities.get(data.activityId);
      if (!activity) return;
      const isFac = data.token === session.facilitatorToken;
      const isOwner = currentParticipantId === activity.participantId;
      if (!isFac && !isOwner) return;
      session.activities.delete(data.activityId);
      io.to(data.sessionId).emit('activity:deleted', { id: data.activityId });
    });

    // Facilitator actions
    socket.on('session:start', (data: { sessionId: string; token: string }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      session.status = 'active'; session.startedAt = new Date();
      io.to(data.sessionId).emit('session:status', { status: 'active', startedAt: session.startedAt });
    });

    socket.on('session:extend', (data: { sessionId: string; token: string; addMinutes: number }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      // If time already expired, snap window forward to now so remaining becomes positive
      if (session.startedAt) {
        const elapsedMin = (Date.now() - session.startedAt.getTime()) / 60000;
        if (session.submissionWindowMin <= elapsedMin) {
          session.submissionWindowMin = Math.ceil(elapsedMin) + data.addMinutes;
        } else {
          session.submissionWindowMin += data.addMinutes;
        }
      } else {
        session.submissionWindowMin += data.addMinutes;
      }
      io.to(data.sessionId).emit('session:extended', { submissionWindowMin: session.submissionWindowMin });
    });

    socket.on('session:close', (data: { sessionId: string; token: string }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      session.status = 'discussion'; session.closedAt = new Date();
      io.to(data.sessionId).emit('session:status', { status: 'discussion' });
    });

    socket.on('activity:classify', (data: {
      sessionId: string; activityId: string; verdict: string; token: string;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      const activity = session.activities.get(data.activityId);
      if (!activity) return;
      activity.teamAuto = data.verdict as any;
      activity.editHistory.push({ who: session.facilitatorName, what: `tagged → ${data.verdict}`, at: new Date() });
      io.to(data.sessionId).emit('activity:updated', activity);
    });

    socket.on('activity:flag', (data: {
      sessionId: string; activityId: string; flagged: boolean; note?: string; token: string;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      const activity = session.activities.get(data.activityId);
      if (!activity) return;
      activity.flagged = data.flagged;
      if (data.note !== undefined) activity.discussionNote = data.note;
      activity.editHistory.push({ who: session.facilitatorName, what: data.flagged ? 'flagged' : 'unflagged', at: new Date() });
      io.to(data.sessionId).emit('activity:updated', activity);
    });

    socket.on('activity:note', (data: {
      sessionId: string; activityId: string; note: string; token: string;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      const activity = session.activities.get(data.activityId);
      if (!activity) return;
      activity.discussionNote = data.note;
      io.to(data.sessionId).emit('activity:updated', activity);
    });

    socket.on('activity:relate', (data: {
      sessionId: string; idA: string; idB: string; token: string;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      const a = session.activities.get(data.idA);
      const b = session.activities.get(data.idB);
      if (!a || !b) return;
      a.relatedTo = [...new Set([...(a.relatedTo ?? []), data.idB])];
      b.relatedTo = [...new Set([...(b.relatedTo ?? []), data.idA])];
      io.to(data.sessionId).emit('activity:updated', a);
      io.to(data.sessionId).emit('activity:updated', b);
    });

    socket.on('disconnect', () => {
      if (currentSessionId && currentParticipantId) {
        const session = sessions.get(currentSessionId);
        if (session) {
          session.participants.delete(currentParticipantId);
          io.to(currentSessionId).emit('participant:left', { id: currentParticipantId });
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Work Audit ready on http://${hostname}:${port}`);
  });
});

// ── Default recall prompts ─────────────────────────────────────────────────

const DEFAULT_PROMPTS = [
  'Yesterday & this week',
  'Weekly recurring meetings',
  'Monthly rituals',
  'Quarterly cycles',
  'Annual / one-offs',
  'Things you procrastinate',
  'Manual but should be automatic',
  'Where you get interrupted',
  "Hidden work your team doesn't see",
];
