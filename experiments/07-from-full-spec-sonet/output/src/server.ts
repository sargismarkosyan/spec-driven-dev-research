import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP } from './mcp';
import sessions, {
  Session, Activity, Participant,
  AVATAR_COLORS, makeInitials, mergeSimilarity, titleSimilarity,
  TPO_HOURS, FREQ_PER_WK, ENERGY_MULTIPLIER,
  Role, TimePerOccurrence, Frequency, Energy,
} from './store';

const ALL_CATEGORY_IDS = [
  'yesterday', 'weekly-meetings', 'monthly-rituals', 'oncall',
  'quarterly', 'manual-chores', 'handoffs', 'automate', 'other',
];

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

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3070', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

// ── Helpers ───────────────────────────────────────────────────────────────────

function sessionJSON(session: Session) {
  return {
    ...session,
    participants: Array.from(session.participants.values()),
    activities: Array.from(session.activities.values()),
  };
}

function pickColor(session: Session): string {
  const used = new Set(Array.from(session.participants.values()).map(p => p.color));
  return AVATAR_COLORS.find(c => !used.has(c)) ?? AVATAR_COLORS[session.participants.size % AVATAR_COLORS.length];
}

/** Facilitator auth: check header, body, or query param */
function getFacilitatorToken(req: express.Request): string {
  return (
    (req.headers['x-facilitator-token'] as string) ||
    req.body?.token ||
    req.body?.facilitatorToken ||
    (req.query?.token as string) ||
    ''
  );
}

function isFacilitator(req: express.Request, session: Session): boolean {
  return getFacilitatorToken(req) === session.facilitatorToken;
}

function tpoLabel(tpo: string): string {
  const map: Record<string, string> = {
    '<30m': '< 30 min',
    '30m-2h': '30 min – 2 hrs',
    'half-day': 'Half day',
    'day+': 'A full day or more',
  };
  return map[tpo] ?? tpo;
}

function perceivedCost(a: Activity): number {
  return (TPO_HOURS[a.tpo] ?? 1) * (FREQ_PER_WK[a.freq] ?? 1) * (ENERGY_MULTIPLIER[a.energy] ?? 1);
}

function buildMarkdownExport(session: Session): string {
  const sortSection = (arr: Activity[]): Activity[] => [
    ...arr.filter(a => a.flagged).sort((a, b) => perceivedCost(b) - perceivedCost(a)),
    ...arr.filter(a => !a.flagged).sort((a, b) => perceivedCost(b) - perceivedCost(a)),
  ];

  const acts = Array.from(session.activities.values());
  const automatable = sortSection(acts.filter(a => a.teamAuto === 'yes'));
  const investigate = sortSection(acts.filter(a => a.teamAuto === 'maybe'));
  const manual = sortSection(acts.filter(a => a.teamAuto === 'no'));

  const recoverableHrs = [...automatable, ...investigate].reduce((sum, a) => sum + perceivedCost(a), 0);

  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

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

// ── App setup ─────────────────────────────────────────────────────────────────

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── Session REST endpoints ─────────────────────────────────────────────────

  // POST /api/sessions — create session
  app.post('/api/sessions', (req, res) => {
    const {
      name,
      facilitatorName = 'Facilitator',
      submissionWindowMin = 10,
      liveTeamFeed = true,
      recallPrompts,
      enabledCategories,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'name required' });

    const id = crypto.randomUUID().slice(0, 8);
    const token = crypto.randomUUID();
    const session: Session = {
      id,
      name,
      facilitatorId: '',
      facilitatorName,
      facilitatorToken: token,
      status: 'lobby',
      submissionWindowMin,
      liveTeamFeed,
      recallPrompts: recallPrompts ?? DEFAULT_PROMPTS,
      enabledCategories: enabledCategories ?? ALL_CATEGORY_IDS,
      createdAt: new Date(),
      participants: new Map(),
      activities: new Map(),
    };
    sessions.set(id, session);
    return res.status(201).json({ id, token, url: `http://${hostname}:${port}/session/${id}/join` });
  });

  // GET /api/sessions/:id — get session
  app.get('/api/sessions/:id', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    return res.json(sessionJSON(session));
  });

  // PATCH /api/sessions/:id/settings — update settings (lobby only)
  app.patch('/api/sessions/:id/settings', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (!isFacilitator(req, session)) return res.status(403).json({ error: 'forbidden' });
    if (session.status !== 'lobby') return res.status(400).json({ error: 'settings can only be updated in lobby' });

    const { submissionWindowMin, liveTeamFeed, enabledCategories, recallPrompts } = req.body;

    if (submissionWindowMin !== undefined) {
      if (!Number.isInteger(submissionWindowMin) || submissionWindowMin < 0) {
        return res.status(400).json({ error: 'invalid submission window' });
      }
      session.submissionWindowMin = submissionWindowMin;
    }
    if (liveTeamFeed !== undefined) session.liveTeamFeed = liveTeamFeed;
    if (enabledCategories !== undefined) session.enabledCategories = enabledCategories;
    if (recallPrompts !== undefined) session.recallPrompts = recallPrompts;

    io.to(req.params.id).emit('session:settings', {
      submissionWindowMin: session.submissionWindowMin,
      liveTeamFeed: session.liveTeamFeed,
      enabledCategories: session.enabledCategories,
      recallPrompts: session.recallPrompts,
    });

    return res.json(sessionJSON(session));
  });

  // POST /api/sessions/:id/start — lobby → active
  app.post('/api/sessions/:id/start', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (!isFacilitator(req, session)) return res.status(403).json({ error: 'forbidden' });
    session.status = 'active';
    session.startedAt = new Date();
    io.to(req.params.id).emit('session:status', { status: 'active', startedAt: session.startedAt });
    return res.json({ ok: true });
  });

  // POST /api/sessions/:id/extend — additive only (no snap-forward on REST)
  app.post('/api/sessions/:id/extend', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (!isFacilitator(req, session)) return res.status(403).json({ error: 'forbidden' });
    const addMinutes = req.body.addMinutes ?? 2;
    session.submissionWindowMin += addMinutes;
    io.to(req.params.id).emit('session:extended', { submissionWindowMin: session.submissionWindowMin });
    return res.json({ ok: true });
  });

  // POST /api/sessions/:id/close — active → discussion
  app.post('/api/sessions/:id/close', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (!isFacilitator(req, session)) return res.status(403).json({ error: 'forbidden' });
    session.status = 'discussion';
    session.closedAt = new Date();
    io.to(req.params.id).emit('session:status', { status: 'discussion' });
    return res.json({ ok: true });
  });

  // POST /api/sessions/:id/complete — discussion → done
  app.post('/api/sessions/:id/complete', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (!isFacilitator(req, session)) return res.status(403).json({ error: 'forbidden' });
    session.status = 'done';
    io.to(req.params.id).emit('session:status', { status: 'done' });
    return res.json({ ok: true });
  });

  // GET /api/sessions/:id/export — markdown export
  app.get('/api/sessions/:id/export', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    const markdown = buildMarkdownExport(session);
    return res.json({ markdown, filename: `${session.id}-audit.md` });
  });

  // ── Activity REST endpoints ────────────────────────────────────────────────

  // POST /api/sessions/:id/activities — add activity
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
      title,
      tpo: tpo as TimePerOccurrence,
      freq: freq as Frequency,
      energy: energy as Energy,
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

  // GET /api/sessions/:id/activities — list all activities
  app.get('/api/sessions/:id/activities', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    return res.json(Array.from(session.activities.values()));
  });

  // GET /api/sessions/:id/activities/merge-candidates — MUST be before /:actId
  app.get('/api/sessions/:id/activities/merge-candidates', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });

    const actId = req.query.actId as string;
    if (!actId) return res.status(400).json({ error: 'actId query param required' });

    const source = session.activities.get(actId);
    if (!source) return res.status(404).json({ error: 'activity not found' });

    const candidates = Array.from(session.activities.values())
      .filter(a => a.id !== source.id && !a.isMergedSource)
      .map(a => ({
        ...a,
        sem: Math.min(1, titleSimilarity(source.title, a.title) * 1.3),
        sameFreq: source.freq === a.freq,
        sameTpo: source.tpo === a.tpo,
        similarity: mergeSimilarity(source, a),
      }))
      .filter(a => a.similarity > 0.15)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return res.json(candidates);
  });

  // POST /api/sessions/:id/activities/merge — MUST be before /:actId
  app.post('/api/sessions/:id/activities/merge', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (!isFacilitator(req, session)) return res.status(403).json({ error: 'forbidden' });

    const { sourceIds, title, tpo, freq, energy } = req.body as {
      sourceIds: string[]; title?: string; tpo: string; freq: string; energy: string;
    };

    const sources = (sourceIds ?? [])
      .map(sid => session.activities.get(sid))
      .filter(Boolean) as Activity[];

    if (sources.length < 2) return res.status(400).json({ error: 'need at least 2 source activities' });

    const newId = crypto.randomUUID().slice(0, 8);
    const first = sources[0];
    const newActivity: Activity = {
      id: newId,
      sessionId: session.id,
      participantId: first.participantId,
      participantName: first.participantName,
      participantInitials: first.participantInitials,
      participantColor: first.participantColor,
      title: title ?? first.title,
      tpo: (tpo ?? first.tpo) as TimePerOccurrence,
      freq: (freq ?? first.freq) as Frequency,
      energy: (energy ?? first.energy) as Energy,
      teamAuto: 'unclassified',
      flagged: false,
      discussionNote: '',
      createdAt: new Date(),
      editHistory: [],
      mergedFromIds: sources.map(s => s.id),
      mergedFromNames: sources.map(s => s.participantName),
      mergedFromInitials: sources.map(s => s.participantInitials),
      mergedFromColors: sources.map(s => s.participantColor),
      reportedBy: sources.map(s => s.participantName),
      reportedByInitials: sources.map(s => s.participantInitials),
      reportedByColors: sources.map(s => s.participantColor),
    };
    session.activities.set(newId, newActivity);

    const updatedSources = sources.map(s => {
      s.mergedIntoId = newId;
      s.isMergedSource = true;
      return s;
    });

    io.to(req.params.id).emit('activity:merged', { newActivity, updatedSources });
    return res.json({ newActivity, updatedSources });
  });

  // POST /api/sessions/:id/activities/relate — MUST be before /:actId
  app.post('/api/sessions/:id/activities/relate', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (!isFacilitator(req, session)) return res.status(403).json({ error: 'forbidden' });

    const { activityId, relatedId } = req.body;
    if (!activityId || !relatedId) return res.status(400).json({ error: 'activityId and relatedId are required' });

    const a = session.activities.get(activityId);
    const b = session.activities.get(relatedId);
    if (!a || !b) return res.status(404).json({ error: 'not found' });

    a.relatedTo = [...new Set([...(a.relatedTo ?? []), relatedId])];
    b.relatedTo = [...new Set([...(b.relatedTo ?? []), activityId])];

    io.to(req.params.id).emit('activity:updated', a);
    io.to(req.params.id).emit('activity:updated', b);

    return res.json({ a, b });
  });

  // PATCH /api/sessions/:id/activities/:actId — update activity
  app.patch('/api/sessions/:id/activities/:actId', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    const activity = session.activities.get(req.params.actId);
    if (!activity) return res.status(404).json({ error: 'not found' });

    const { participantId, token, title, tpo, freq, energy, teamAuto } = req.body;
    const fac = token === session.facilitatorToken;
    const owner = participantId === activity.participantId;
    if (!fac && !owner) return res.status(403).json({ error: 'forbidden' });

    const editor = fac ? session.facilitatorName : activity.participantName;
    if (title !== undefined) activity.title = title;
    if (tpo !== undefined) activity.tpo = tpo as TimePerOccurrence;
    if (freq !== undefined) activity.freq = freq as Frequency;
    if (energy !== undefined) activity.energy = energy as Energy;
    if (teamAuto !== undefined) activity.teamAuto = teamAuto;
    if (fac) activity.editedBy = session.facilitatorName;
    activity.editHistory.push({ who: editor, what: 'updated', at: new Date() });

    io.to(req.params.id).emit('activity:updated', activity);
    return res.json(activity);
  });

  // DELETE /api/sessions/:id/activities/:actId — delete activity
  app.delete('/api/sessions/:id/activities/:actId', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    const activity = session.activities.get(req.params.actId);
    if (!activity) return res.status(404).json({ error: 'not found' });

    const { participantId, token } = req.body;
    const fac = token === session.facilitatorToken;
    const owner = participantId === activity.participantId;
    if (!fac && !owner) return res.status(403).json({ error: 'forbidden' });

    session.activities.delete(req.params.actId);
    io.to(req.params.id).emit('activity:deleted', { id: req.params.actId });
    return res.json({ ok: true });
  });

  // POST /api/sessions/:id/activities/:actId/classify — set teamAuto verdict
  app.post('/api/sessions/:id/activities/:actId/classify', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (!isFacilitator(req, session)) return res.status(403).json({ error: 'forbidden' });

    const activity = session.activities.get(req.params.actId);
    if (!activity) return res.status(404).json({ error: 'not found' });

    const { verdict, teamAuto } = req.body;
    const v = verdict ?? teamAuto;
    if (!['yes', 'maybe', 'no', 'unclassified'].includes(v)) {
      return res.status(400).json({ error: 'invalid verdict' });
    }
    activity.teamAuto = v;
    activity.editHistory.push({
      who: session.facilitatorName,
      what: `tagged automatable → ${v}`,
      at: new Date(),
    });

    io.to(req.params.id).emit('activity:updated', activity);
    return res.json(activity);
  });

  // POST /api/sessions/:id/activities/:actId/flag — flag/unflag
  app.post('/api/sessions/:id/activities/:actId/flag', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (!isFacilitator(req, session)) return res.status(403).json({ error: 'forbidden' });

    const activity = session.activities.get(req.params.actId);
    if (!activity) return res.status(404).json({ error: 'not found' });

    activity.flagged = req.body.flagged ?? !activity.flagged;
    if (req.body.note !== undefined) activity.discussionNote = req.body.note;
    activity.editHistory.push({
      who: session.facilitatorName,
      what: activity.flagged ? 'flagged' : 'unflagged',
      at: new Date(),
    });

    io.to(req.params.id).emit('activity:updated', activity);
    return res.json(activity);
  });

  // POST /api/sessions/:id/activities/:actId/note — set discussion note
  app.post('/api/sessions/:id/activities/:actId/note', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (!isFacilitator(req, session)) return res.status(403).json({ error: 'forbidden' });

    const activity = session.activities.get(req.params.actId);
    if (!activity) return res.status(404).json({ error: 'not found' });

    activity.discussionNote = req.body.note ?? '';
    io.to(req.params.id).emit('activity:updated', activity);
    return res.json(activity);
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

    socket.on('join-session', (data: {
      sessionId: string; name: string; role?: Role; isFacilitator?: boolean; token?: string;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session) {
        socket.emit('error', `session not found: ${data.sessionId} (server may have restarted — return to home and create a new session)`);
        return;
      }

      currentSessionId = data.sessionId;
      socket.join(data.sessionId);

      if (data.isFacilitator && data.token === session.facilitatorToken) {
        // Facilitator reconnect/join: rebind socket ID
        session.facilitatorId = socket.id;
        currentParticipantId = socket.id;
      } else {
        // Engineer: name-based reconnection rebinding
        let participant = [...session.participants.values()].find(p => p.name === data.name);

        if (participant) {
          if (participant.id !== socket.id) {
            const oldId = participant.id;
            session.participants.delete(oldId);
            participant.id = socket.id;
            session.participants.set(socket.id, participant);
            socket.broadcast.to(data.sessionId).emit('participant:left', { id: oldId });
          }
        } else {
          // Recover identity from orphan activities if any
          const orphan = [...session.activities.values()].find(a => a.participantName === data.name);
          participant = {
            id: socket.id,
            name: data.name,
            role: (data.role ?? 'IC') as Role,
            joinedAt: new Date(),
            color: orphan?.participantColor ?? pickColor(session),
            initials: orphan?.participantInitials ?? makeInitials(data.name),
          };
          session.participants.set(socket.id, participant);
        }

        // Re-target all activities authored by this name to the new socket ID
        for (const a of session.activities.values()) {
          if (a.participantName === data.name) a.participantId = socket.id;
        }

        currentParticipantId = socket.id;
        socket.broadcast.to(data.sessionId).emit('participant:joined', participant);
      }

      socket.emit('session:state', sessionJSON(session));
    });

    // ── Activity socket events ───────────────────────────────────────────────

    socket.on('activity:add', (data: {
      sessionId: string; title: string; tpo: TimePerOccurrence; freq: Frequency; energy: Energy;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session || !currentParticipantId) return;
      const participant = session.participants.get(currentParticipantId);
      if (!participant || session.status !== 'active') return;

      const activity: Activity = {
        id: crypto.randomUUID(),
        sessionId: data.sessionId,
        participantId: currentParticipantId,
        participantName: participant.name,
        participantInitials: participant.initials,
        participantColor: participant.color,
        title: data.title,
        tpo: data.tpo,
        freq: data.freq,
        energy: data.energy,
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
        socket.emit('error', `session not found: ${data.sessionId}`);
        return;
      }
      const activity = session.activities.get(data.activityId);
      if (!activity) {
        socket.emit('error', `activity not found: ${data.activityId}`);
        return;
      }

      const isFac = data.token === session.facilitatorToken;
      const isOwner = currentParticipantId === activity.participantId;
      if (!isFac && !isOwner) {
        socket.emit('error', 'edit blocked: not your activity (try refreshing)');
        return;
      }

      if (data.title !== undefined) activity.title = data.title;
      if (data.tpo !== undefined) activity.tpo = data.tpo;
      if (data.freq !== undefined) activity.freq = data.freq;
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

    // ── Facilitator session control ──────────────────────────────────────────

    socket.on('session:start', (data: { sessionId: string; token: string }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      session.status = 'active';
      session.startedAt = new Date();
      io.to(data.sessionId).emit('session:status', { status: 'active', startedAt: session.startedAt });
    });

    socket.on('session:extend', (data: { sessionId: string; token: string; addMinutes: number }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      // Snap-forward: if timer expired, reset from NOW
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
      session.status = 'discussion';
      session.closedAt = new Date();
      io.to(data.sessionId).emit('session:status', { status: 'discussion' });
    });

    socket.on('session:complete', (data: { sessionId: string; token: string }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      session.status = 'done';
      io.to(data.sessionId).emit('session:status', { status: 'done' });
    });

    socket.on('session:settings', (data: {
      sessionId: string; token: string;
      settings: { submissionWindowMin?: number; liveTeamFeed?: boolean; enabledCategories?: string[]; recallPrompts?: string[] };
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      if (session.status !== 'lobby') return;
      const s = data.settings ?? {};
      if (s.submissionWindowMin !== undefined) session.submissionWindowMin = s.submissionWindowMin;
      if (s.liveTeamFeed !== undefined) session.liveTeamFeed = s.liveTeamFeed;
      if (s.enabledCategories !== undefined) session.enabledCategories = s.enabledCategories;
      if (s.recallPrompts !== undefined) session.recallPrompts = s.recallPrompts;
      io.to(data.sessionId).emit('session:settings', {
        submissionWindowMin: session.submissionWindowMin,
        liveTeamFeed: session.liveTeamFeed,
        enabledCategories: session.enabledCategories,
        recallPrompts: session.recallPrompts,
      });
    });

    // ── Facilitator activity actions ─────────────────────────────────────────

    socket.on('activity:classify', (data: {
      sessionId: string; activityId: string; verdict: string; token: string;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      const activity = session.activities.get(data.activityId);
      if (!activity) return;
      activity.teamAuto = data.verdict as Activity['teamAuto'];
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
      activity.editHistory.push({
        who: session.facilitatorName,
        what: data.flagged ? 'flagged' : 'unflagged',
        at: new Date(),
      });
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

    socket.on('activity:merge', (data: {
      sessionId: string; sourceIds: string[]; title?: string;
      tpo: string; freq: string; energy: string; token: string;
    }) => {
      const session = sessions.get(data.sessionId);
      if (!session || data.token !== session.facilitatorToken) return;
      const sources = (data.sourceIds ?? [])
        .map(sid => session.activities.get(sid))
        .filter(Boolean) as Activity[];
      if (sources.length < 2) return;

      const newId = crypto.randomUUID().slice(0, 8);
      const first = sources[0];
      const newActivity: Activity = {
        id: newId,
        sessionId: session.id,
        participantId: first.participantId,
        participantName: first.participantName,
        participantInitials: first.participantInitials,
        participantColor: first.participantColor,
        title: data.title ?? first.title,
        tpo: (data.tpo ?? first.tpo) as TimePerOccurrence,
        freq: (data.freq ?? first.freq) as Frequency,
        energy: (data.energy ?? first.energy) as Energy,
        teamAuto: 'unclassified',
        flagged: false,
        discussionNote: '',
        createdAt: new Date(),
        editHistory: [],
        mergedFromIds: sources.map(s => s.id),
        mergedFromNames: sources.map(s => s.participantName),
        mergedFromInitials: sources.map(s => s.participantInitials),
        mergedFromColors: sources.map(s => s.participantColor),
        reportedBy: sources.map(s => s.participantName),
        reportedByInitials: sources.map(s => s.participantInitials),
        reportedByColors: sources.map(s => s.participantColor),
      };
      session.activities.set(newId, newActivity);

      const updatedSources = sources.map(s => {
        s.mergedIntoId = newId;
        s.isMergedSource = true;
        return s;
      });

      io.to(data.sessionId).emit('activity:merged', { newActivity, updatedSources });
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
