# Work Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Work Audit collaborative retro app in `experiments/07-from-full-spec-sonet/output/` — replacing the generic Toil Tracker starter — so that every requirement in the 55-file spec is working.

**Architecture:** Custom Next.js 14 server on Express handles REST (`/api/*`), Socket.io rooms (one per session), MCP (`/mcp`), and serves the Next.js app — all in a single Node process. In-memory `Map<sessionId, Session>` is the only data store. Engineers connect to `/session/[id]/board`; facilitators connect to `/session/[id]/facilitator`. Port 3070 per non-functional spec.

**Tech Stack:** TypeScript, Next.js 14 App Router, Express 4, Socket.io 4, `@modelcontextprotocol/sdk`, Zod, Tailwind CSS + custom `wa-*` CSS design system (Newsreader + IBM Plex Sans + IBM Plex Mono fonts).

---

## Canonical Rules (always apply)

- **Port:** 3070
- **Energy enum:** `energizing | fine | tedious | draining` (`fine` not `neutral`)
- **Session ID:** 8-char truncated UUID v4; **engineer activity ID:** full UUID v4; **merged result ID:** 8-char truncated UUID
- **Facilitator** is NOT in `session.participants` map
- **Engineer export UI:** none — REST + MCP only
- **Discussion topbar:** session-wide `{classified}/{total} classified`
- **liveTeamFeed=false:** hides team feed AND suggestions (spec target; implement per spec)
- **Merged sources:** hidden in all facilitator views; NOT filtered on engineer board or REST export
- **Soft delete:** 5s undo toast (engineers only, own activities, during active phase only)
- **Timer snap-forward:** Socket `session:extend` only; REST `/extend` is additive only
- **Export filenames:** API returns `{id}-audit.md`; modal download uses `{session.name-slug}-audit.md`
- **`IMPLEMENTATION-INDEX.md`** is authoritative when spec files conflict

---

## File Structure

```
output/
├── src/
│   ├── store.ts          # Domain types + in-memory state + helpers
│   ├── server.ts         # Express + Socket.io + Next custom server (port 3070)
│   └── mcp.ts            # MCP read-only tools (4 tools)
├── app/
│   ├── layout.tsx         # Font loading + global metadata
│   ├── globals.css        # wa-* design system + Tailwind
│   ├── page.tsx           # Home = Create session (facilitator)
│   ├── session/
│   │   └── [id]/
│   │       ├── page.tsx   # Smart router: facilitator vs engineer
│   │       ├── join/
│   │       │   └── page.tsx   # Engineer join screen
│   │       ├── board/
│   │       │   └── page.tsx   # Engineer board (lobby/active/discussion)
│   │       ├── lobby/
│   │       │   └── page.tsx   # Facilitator lobby
│   │       └── facilitator/
│   │           └── page.tsx   # Facilitator hub (Live/Matrix/Grouped/Discuss + modals)
│   └── components/
│       └── Primitives.tsx  # Shared types, helpers, UI building blocks
├── lib/
│   ├── socket.ts          # Socket.io client singleton
│   └── categories.ts      # 9 prompt categories data
└── skills/
    ├── summarize-session/SKILL.md
    ├── find-best-opportunities/SKILL.md
    └── draft-backlog/SKILL.md
```

---

## Task 1: Data Model — `src/store.ts`

**Files:**
- Modify: `src/store.ts` (full replacement)

- [ ] **Step 1: Replace store.ts with Work Audit domain types**

Replace the entire file with:

```typescript
// Work Audit — in-memory store
// Spec: 02-data-model/*, 10-business-rules/*

export type TimePerOccurrence = '<30m' | '30m-2h' | 'half-day' | 'day+';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
// CANONICAL: energizing/fine/tedious/draining (not neutral) — see IMPLEMENTATION-INDEX.md
export type Energy = 'energizing' | 'fine' | 'tedious' | 'draining';
export type AutoVerdict = 'yes' | 'maybe' | 'no' | 'unclassified';
export type SessionStatus = 'lobby' | 'active' | 'discussion' | 'done';
export type Role = 'IC' | 'EM' | 'PM' | 'UX' | 'Other';

export type Participant = {
  id: string;           // socket.id (rebound on reconnect)
  name: string;
  role: Role;
  joinedAt: Date;
  color: string;        // from AVATAR_COLORS palette
  initials: string;     // computed by makeInitials()
};

export type EditHistoryEntry = {
  who: string;
  what: string;
  at: Date;
};

export type Activity = {
  id: string;           // full UUID v4 for engineer; 8-char for merged result
  sessionId: string;
  participantId: string;
  participantName: string;
  participantInitials: string;
  participantColor: string;
  title: string;
  tpo: TimePerOccurrence;
  freq: Frequency;
  energy: Energy;
  teamAuto: AutoVerdict;
  flagged: boolean;
  discussionNote: string;
  createdAt: Date;
  editedBy?: string;
  editHistory: EditHistoryEntry[];
  // merge support — spec: 02-data-model/activity.md, 10-business-rules/merge-rules.md
  mergedFromIds?: string[];
  mergedFromNames?: string[];
  mergedFromInitials?: string[];
  mergedFromColors?: string[];
  reportedBy?: string[];
  reportedByInitials?: string[];
  reportedByColors?: string[];
  mergedIntoId?: string;      // set on source when merged into a new card
  isMergedSource?: boolean;
  // related activities — spec: 05-real-time/client-to-server.md activity:relate
  relatedTo?: string[];
};

export type Session = {
  id: string;                   // 8-char truncated UUID
  name: string;
  facilitatorId: string;        // socket.id of facilitator (updated on reconnect)
  facilitatorName: string;
  facilitatorToken: string;     // UUID v4 secret; stored as ?token= in URL
  status: SessionStatus;        // forward-only: lobby→active→discussion→done
  submissionWindowMin: number;  // 0 = untimed
  liveTeamFeed: boolean;
  recallPrompts: string[];
  enabledCategories: string[];  // min 1 required; PATCH rejects empty
  createdAt: Date;
  startedAt?: Date;
  closedAt?: Date;
  // facilitator NOT in participants — spec: 02-data-model/participant.md
  participants: Map<string, Participant>;
  activities: Map<string, Activity>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const AVATAR_COLORS = [
  '#b14d2f', '#6b7d5a', '#c8945f', '#5a7a8a',
  '#7a5a8a', '#3a342c', '#4a6a7a', '#8a5a3a',
];

// spec: 02-data-model/enumerations.md
export const TPO_HOURS: Record<TimePerOccurrence, number> = {
  '<30m': 0.5, '30m-2h': 1.25, 'half-day': 4, 'day+': 8,
};

export const FREQ_PER_WK: Record<Frequency, number> = {
  daily: 5, weekly: 1, monthly: 0.23, quarterly: 0.077, adhoc: 0.3,
};

export const ENERGY_MULTIPLIER: Record<Energy, number> = {
  energizing: 0.5, fine: 1.0, tedious: 1.5, draining: 2.0,
};

// spec: 02-data-model/calculations.md
export function effortHrsPerWk(a: Pick<Activity, 'tpo' | 'freq'>): number {
  return TPO_HOURS[a.tpo] * FREQ_PER_WK[a.freq];
}

export function effortDisplay(hrs: number): string {
  if (hrs < 1)   return '<1 h/wk';
  if (hrs < 1.5) return '~1 h/wk';
  if (hrs < 3)   return `~${hrs.toFixed(1)} h/wk`;
  if (hrs < 8)   return `~${Math.round(hrs)} h/wk`;
  return '8+ h/wk';
}

export function perceivedCost(a: Pick<Activity, 'tpo' | 'freq' | 'energy'>): number {
  return effortHrsPerWk(a) * ENERGY_MULTIPLIER[a.energy];
}

// spec: 02-data-model/calculations.md — matrix coordinates
// X = min(92, sqrt(h/12)*100); Y = fixed per energy
export function matrixCoords(a: Pick<Activity, 'tpo' | 'freq' | 'energy'>): { x: number; y: number } {
  const h = effortHrsPerWk(a);
  const x = Math.min(92, Math.sqrt(h / 12) * 100);
  const yMap: Record<Energy, number> = {
    draining: 12, tedious: 37, fine: 63, energizing: 88,
  };
  return { x, y: yMap[a.energy] };
}

// spec: 02-data-model/participant.md — initials algorithm
export function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// spec: 10-business-rules/merge-rules.md
// Jaccard similarity on word tokens (len > 2)
export function titleSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const aWords = new Set(tokenize(a));
  const bWords = new Set(tokenize(b));
  if (aWords.size === 0 && bWords.size === 0) return 0;
  const intersection = [...aWords].filter(w => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union > 0 ? intersection / union : 0;
}

// spec: 04-facilitator-flow/merge-modal.md — merge similarity score
export function mergeSimilarity(
  a: Pick<Activity, 'title' | 'tpo' | 'freq'>,
  b: Pick<Activity, 'title' | 'tpo' | 'freq'>
): number {
  const sem = titleSimilarity(a.title, b.title);
  const sameFreq = a.freq === b.freq ? 1 : 0;
  const sameTpo  = a.tpo  === b.tpo  ? 1 : 0;
  return 0.85 * sem + 0.10 * sameFreq + 0.05 * sameTpo;
}

// spec: 03-engineer-flow/suggestions.md — group prefix for dedup
export function suggestionKey(title: string): string {
  return title.trim().toLowerCase().slice(0, 30);
}

// ── In-memory state ───────────────────────────────────────────────────────────

const sessions = new Map<string, Session>();

export default sessions;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
npx tsc --noEmit 2>&1 | head -30
```

Expected: Errors only in server.ts / other files (not store.ts), since store.ts is standalone types.

- [ ] **Step 3: Commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add src/store.ts
git commit -m "feat: replace Toil Tracker store with Work Audit domain model"
```

---

## Task 2: Server — Session REST API + MCP + Socket Setup

**Files:**
- Modify: `src/server.ts` (full replacement)
- Modify: `src/mcp.ts` (full replacement)

This task wires up the custom Next.js server on port 3070 with all session-level REST endpoints and the socket.io room structure. Activity endpoints and socket events come in Task 3.

- [ ] **Step 1: Replace src/server.ts with Work Audit server (session REST + socket skeleton)**

Replace `src/server.ts` with the following complete file. Read `spec/06-rest-api/session-endpoints.md` for exact error strings before writing:

```typescript
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import express, { Request, Response, NextFunction } from 'express';
import { Server as SocketIO, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import sessions, {
  Session, Participant, Activity,
  AVATAR_COLORS, makeInitials, effortHrsPerWk, effortDisplay,
  perceivedCost, mergeSimilarity, suggestionKey,
  TPO_HOURS, FREQ_PER_WK, ENERGY_MULTIPLIER,
  TimePerOccurrence, Frequency, Energy, AutoVerdict, Role, SessionStatus,
} from './store';
import { setupMCP } from './mcp';

const dev  = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT ?? '3070', 10);
const app  = next({ dev });
const handle = app.getRequestHandler();

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8);
}

/** Flatten Maps to arrays for JSON serialization */
function sessionJSON(s: Session) {
  return {
    ...s,
    participants: Array.from(s.participants.values()),
    activities:   Array.from(s.activities.values()),
  };
}

function requireFacilitator(req: Request, res: Response, s: Session): boolean {
  const token = req.headers['x-facilitator-token'] as string | undefined
             ?? req.body?.facilitatorToken
             ?? req.query?.token;
  if (!token || token !== s.facilitatorToken) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

// spec: 02-data-model/calculations.md — markdown export
function buildExportMarkdown(s: Session): string {
  const acts = Array.from(s.activities.values());
  // spec: REST export does NOT filter merged sources (IMPLEMENTATION-INDEX.md)
  const flagged   = acts.filter(a => a.flagged).sort((a, b) => perceivedCost(b) - perceivedCost(a));
  const auto      = acts.filter(a => !a.flagged && a.teamAuto === 'yes').sort((a, b) => perceivedCost(b) - perceivedCost(a));
  const maybe     = acts.filter(a => !a.flagged && a.teamAuto === 'maybe').sort((a, b) => perceivedCost(b) - perceivedCost(a));
  const manual    = acts.filter(a => !a.flagged && a.teamAuto === 'no').sort((a, b) => perceivedCost(b) - perceivedCost(a));
  const unclassed = acts.filter(a => !a.flagged && a.teamAuto === 'unclassified').sort((a, b) => perceivedCost(b) - perceivedCost(a));

  const fmtAct = (a: Activity) => {
    const hrs = effortHrsPerWk(a);
    const cost = perceivedCost(a);
    return `- **${a.title}** — ${a.participantName} · ${a.tpo} · ${a.freq} · ${a.energy} · ${effortDisplay(hrs)} · perceived ${cost.toFixed(1)} h/wk${a.flagged ? ' ★' : ''}${a.discussionNote ? `\n  _${a.discussionNote}_` : ''}`;
  };

  const lines = [
    `# Work Audit · ${s.name}`,
    `Facilitator: ${s.facilitatorName || 'Unknown'} · ${acts.length} activities · ${s.participants.size} participants`,
    `Status: ${s.status}`,
    '',
    `## ★ Flagged priorities (${flagged.length})`,
    flagged.length ? flagged.map(fmtAct).join('\n') : '_None_',
    '',
    `## Automatable (${auto.length})`,
    auto.length ? auto.map(fmtAct).join('\n') : '_None_',
    '',
    `## Maybe automatable (${maybe.length})`,
    maybe.length ? maybe.map(fmtAct).join('\n') : '_None_',
    '',
    `## Manual forever (${manual.length})`,
    manual.length ? manual.map(fmtAct).join('\n') : '_None_',
    '',
    `## Unclassified (${unclassed.length})`,
    unclassed.length ? unclassed.map(fmtAct).join('\n') : '_None_',
    '',
    '---',
    '_Automatability classified by team during discussion — not self-report._',
  ];
  return lines.join('\n');
}

// ── REST: sessions ────────────────────────────────────────────────────────────

function setupSessionRoutes(expressApp: express.Application) {
  // POST /api/sessions — create session
  expressApp.post('/api/sessions', (req: Request, res: Response) => {
    const { name, submissionWindowMin = 10, liveTeamFeed = true, enabledCategories = [], recallPrompts = [] } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Session name is required' });
    }
    if (!Array.isArray(enabledCategories) || enabledCategories.length < 1) {
      return res.status(400).json({ error: 'At least one category must be enabled' });
    }
    const id = shortId();
    const session: Session = {
      id,
      name: name.trim(),
      facilitatorId: '',
      facilitatorName: '',
      facilitatorToken: randomUUID(),
      status: 'lobby',
      submissionWindowMin: Number(submissionWindowMin),
      liveTeamFeed: Boolean(liveTeamFeed),
      recallPrompts: Array.isArray(recallPrompts) ? recallPrompts : [],
      enabledCategories,
      createdAt: new Date(),
      participants: new Map(),
      activities: new Map(),
    };
    sessions.set(id, session);
    res.status(201).json(sessionJSON(session));
  });

  // GET /api/sessions/:id
  expressApp.get('/api/sessions/:id', (req: Request, res: Response) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    res.json(sessionJSON(s));
  });

  // PATCH /api/sessions/:id/settings — lobby only; requires facilitator token
  expressApp.patch('/api/sessions/:id/settings', (req: Request, res: Response) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (!requireFacilitator(req, res, s)) return;
    if (s.status !== 'lobby') return res.status(409).json({ error: 'Settings can only be changed in lobby' });
    const { submissionWindowMin, liveTeamFeed, enabledCategories } = req.body;
    if (enabledCategories !== undefined) {
      if (!Array.isArray(enabledCategories) || enabledCategories.length < 1) {
        return res.status(400).json({ error: 'enabledCategories must have at least one entry' });
      }
      s.enabledCategories = enabledCategories;
    }
    if (submissionWindowMin !== undefined) s.submissionWindowMin = Number(submissionWindowMin);
    if (liveTeamFeed !== undefined) s.liveTeamFeed = Boolean(liveTeamFeed);
    res.json(sessionJSON(s));
  });

  // POST /api/sessions/:id/start
  expressApp.post('/api/sessions/:id/start', (req: Request, res: Response) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (!requireFacilitator(req, res, s)) return;
    if (s.status !== 'lobby') return res.status(409).json({ error: 'Session is not in lobby' });
    s.status = 'active';
    s.startedAt = new Date();
    res.json(sessionJSON(s));
  });

  // POST /api/sessions/:id/extend — additive only (no snap-forward on REST)
  expressApp.post('/api/sessions/:id/extend', (req: Request, res: Response) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (!requireFacilitator(req, res, s)) return;
    if (s.status !== 'active') return res.status(409).json({ error: 'Session is not active' });
    const { minutes } = req.body;
    if (!minutes || isNaN(Number(minutes)) || Number(minutes) <= 0) {
      return res.status(400).json({ error: 'minutes must be a positive number' });
    }
    s.submissionWindowMin = (s.submissionWindowMin || 0) + Number(minutes);
    res.json(sessionJSON(s));
  });

  // POST /api/sessions/:id/close — transition to discussion
  expressApp.post('/api/sessions/:id/close', (req: Request, res: Response) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (!requireFacilitator(req, res, s)) return;
    if (s.status !== 'active') return res.status(409).json({ error: 'Session is not active' });
    s.status = 'discussion';
    s.closedAt = new Date();
    res.json(sessionJSON(s));
  });

  // POST /api/sessions/:id/complete — transition to done
  expressApp.post('/api/sessions/:id/complete', (req: Request, res: Response) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (!requireFacilitator(req, res, s)) return;
    if (s.status !== 'discussion') return res.status(409).json({ error: 'Session is not in discussion' });
    s.status = 'done';
    res.json(sessionJSON(s));
  });

  // GET /api/sessions/:id/export — markdown download
  expressApp.get('/api/sessions/:id/export', (req: Request, res: Response) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    const md = buildExportMarkdown(s);
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${s.id}-audit.md"`);
    res.send(md);
  });
}

// ── REST: activities ──────────────────────────────────────────────────────────

function setupActivityRoutes(expressApp: express.Application, io: SocketIO) {
  const router = express.Router({ mergeParams: true });

  // POST /api/sessions/:id/activities
  router.post('/', (req: Request, res: Response) => {
    const s = sessions.get((req.params as any).id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (s.status !== 'active') return res.status(409).json({ error: 'Activities can only be added during active phase' });
    const { participantId, title, tpo, freq, energy } = req.body;
    if (!title || !tpo || !freq || !energy) {
      return res.status(400).json({ error: 'title, tpo, freq, energy are required' });
    }
    const p = s.participants.get(participantId);
    if (!p) return res.status(403).json({ error: 'Participant not found in session' });
    const act: Activity = {
      id: randomUUID(),
      sessionId: s.id,
      participantId: p.id,
      participantName: p.name,
      participantInitials: p.initials,
      participantColor: p.color,
      title: title.trim(),
      tpo, freq, energy,
      teamAuto: 'unclassified',
      flagged: false,
      discussionNote: '',
      createdAt: new Date(),
      editHistory: [],
      relatedTo: [],
    };
    s.activities.set(act.id, act);
    io.to(s.id).emit('activity:added', act);
    res.status(201).json(act);
  });

  // GET /api/sessions/:id/activities
  router.get('/', (req: Request, res: Response) => {
    const s = sessions.get((req.params as any).id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    res.json(Array.from(s.activities.values()));
  });

  // PATCH /api/sessions/:id/activities/:actId
  router.patch('/:actId', (req: Request, res: Response) => {
    const s = sessions.get((req.params as any).id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    const act = s.activities.get(req.params.actId);
    if (!act) return res.status(404).json({ error: 'Activity not found' });
    const { title, tpo, freq, energy, teamAuto, editedBy } = req.body;
    if (title !== undefined) act.title = String(title).trim();
    if (tpo !== undefined) act.tpo = tpo;
    if (freq !== undefined) act.freq = freq;
    if (energy !== undefined) act.energy = energy;
    if (teamAuto !== undefined) act.teamAuto = teamAuto;
    if (editedBy) {
      act.editedBy = editedBy;
      act.editHistory.push({ who: editedBy, what: 'edited', at: new Date() });
    }
    io.to(s.id).emit('activity:updated', act);
    res.json(act);
  });

  // DELETE /api/sessions/:id/activities/:actId
  router.delete('/:actId', (req: Request, res: Response) => {
    const s = sessions.get((req.params as any).id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (!s.activities.has(req.params.actId)) return res.status(404).json({ error: 'Activity not found' });
    s.activities.delete(req.params.actId);
    io.to(s.id).emit('activity:deleted', { id: req.params.actId });
    res.status(204).send();
  });

  // POST /api/sessions/:id/activities/:actId/classify
  router.post('/:actId/classify', (req: Request, res: Response) => {
    const s = sessions.get((req.params as any).id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (!requireFacilitator(req, res, s)) return;
    const act = s.activities.get(req.params.actId);
    if (!act) return res.status(404).json({ error: 'Activity not found' });
    const { teamAuto } = req.body;
    if (!['yes', 'maybe', 'no', 'unclassified'].includes(teamAuto)) {
      return res.status(400).json({ error: 'teamAuto must be yes|maybe|no|unclassified' });
    }
    act.teamAuto = teamAuto;
    io.to(s.id).emit('activity:updated', act);
    res.json(act);
  });

  // POST /api/sessions/:id/activities/:actId/flag
  router.post('/:actId/flag', (req: Request, res: Response) => {
    const s = sessions.get((req.params as any).id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (!requireFacilitator(req, res, s)) return;
    const act = s.activities.get(req.params.actId);
    if (!act) return res.status(404).json({ error: 'Activity not found' });
    act.flagged = req.body.flagged !== false;
    io.to(s.id).emit('activity:updated', act);
    res.json(act);
  });

  // POST /api/sessions/:id/activities/:actId/note
  router.post('/:actId/note', (req: Request, res: Response) => {
    const s = sessions.get((req.params as any).id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (!requireFacilitator(req, res, s)) return;
    const act = s.activities.get(req.params.actId);
    if (!act) return res.status(404).json({ error: 'Activity not found' });
    act.discussionNote = String(req.body.note ?? '');
    io.to(s.id).emit('activity:updated', act);
    res.json(act);
  });

  // GET /api/sessions/:id/activities/merge-candidates
  router.get('/merge-candidates', (req: Request, res: Response) => {
    const s = sessions.get((req.params as any).id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    const { actId } = req.query;
    const pivot = s.activities.get(String(actId));
    if (!pivot) return res.status(404).json({ error: 'Activity not found' });
    const threshold = 0.15;
    const candidates = Array.from(s.activities.values())
      .filter(a => a.id !== pivot.id && !a.isMergedSource)
      .map(a => ({ activity: a, score: mergeSimilarity(pivot, a) }))
      .filter(c => c.score >= threshold)
      .sort((a, b) => b.score - a.score);
    res.json(candidates);
  });

  // POST /api/sessions/:id/activities/merge
  router.post('/merge', (req: Request, res: Response) => {
    const s = sessions.get((req.params as any).id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (!requireFacilitator(req, res, s)) return;
    const { sourceIds, merged: mergedData } = req.body;
    if (!Array.isArray(sourceIds) || sourceIds.length < 2) {
      return res.status(400).json({ error: 'sourceIds must have at least 2 entries' });
    }
    const sources = sourceIds.map((id: string) => s.activities.get(id)).filter(Boolean) as Activity[];
    if (sources.length !== sourceIds.length) return res.status(404).json({ error: 'One or more source activities not found' });

    const mergedId = shortId();
    const merged: Activity = {
      id: mergedId,
      sessionId: s.id,
      participantId: sources[0].participantId,
      participantName: sources[0].participantName,
      participantInitials: sources[0].participantInitials,
      participantColor: sources[0].participantColor,
      title: mergedData?.title ?? sources[0].title,
      tpo: mergedData?.tpo ?? sources[0].tpo,
      freq: mergedData?.freq ?? sources[0].freq,
      energy: mergedData?.energy ?? sources[0].energy,
      teamAuto: 'unclassified', // reset on merge
      flagged: false,
      discussionNote: '',
      createdAt: new Date(),
      editHistory: [],
      mergedFromIds: sourceIds,
      mergedFromNames: sources.map(a => a.participantName),
      mergedFromInitials: sources.map(a => a.participantInitials),
      mergedFromColors: sources.map(a => a.participantColor),
      reportedBy: sources.map(a => a.participantName),
      reportedByInitials: sources.map(a => a.participantInitials),
      reportedByColors: sources.map(a => a.participantColor),
      relatedTo: [],
    };

    // Mark sources
    sources.forEach(a => {
      a.isMergedSource = true;
      a.mergedIntoId = mergedId;
    });

    s.activities.set(mergedId, merged);
    io.to(s.id).emit('activity:merged', { merged, updatedSources: sources });
    res.status(201).json({ merged, updatedSources: sources });
  });

  // POST /api/sessions/:id/activities/:actId/relate
  router.post('/:actId/relate', (req: Request, res: Response) => {
    const s = sessions.get((req.params as any).id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    const act = s.activities.get(req.params.actId);
    if (!act) return res.status(404).json({ error: 'Activity not found' });
    const { relatedTo } = req.body;
    act.relatedTo = Array.isArray(relatedTo) ? relatedTo : [];
    io.to(s.id).emit('activity:updated', act);
    res.json(act);
  });

  expressApp.use('/api/sessions/:id/activities', router);
}

// ── Socket.io ─────────────────────────────────────────────────────────────────

function setupSocket(io: SocketIO) {
  // Track timers: sessionId → { endTime: Date, intervalId: NodeJS.Timeout }
  const timers = new Map<string, { endTime: Date; intervalId: ReturnType<typeof setInterval> }>();

  function clearTimer(sessionId: string) {
    const t = timers.get(sessionId);
    if (t) { clearInterval(t.intervalId); timers.delete(sessionId); }
  }

  function startTimer(sessionId: string, io: SocketIO) {
    const s = sessions.get(sessionId);
    if (!s || s.submissionWindowMin <= 0) return;
    clearTimer(sessionId);
    const endTime = new Date(Date.now() + s.submissionWindowMin * 60 * 1000);
    const intervalId = setInterval(() => {
      const remaining = Math.floor((endTime.getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        clearTimer(sessionId);
        // spec: timer expiry does NOT auto-close session — just broadcast 0
        io.to(sessionId).emit('session:extended', { submissionWindowMin: 0, remainingSeconds: 0 });
      }
    }, 1000);
    timers.set(sessionId, { endTime, intervalId });
    return endTime;
  }

  io.on('connection', (socket: Socket) => {
    // join-session: engineer or facilitator joins a socket room
    socket.on('join-session', (data: { sessionId: string; name?: string; role?: Role; token?: string }) => {
      const { sessionId, name, role, token } = data;
      const s = sessions.get(sessionId);
      if (!s) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Facilitator join
      if (token && token === s.facilitatorToken) {
        // Reconnect: rebind socket
        s.facilitatorId = socket.id;
        socket.join(sessionId);
        socket.emit('session:state', sessionJSON(s));
        return;
      }

      // Engineer join — reconnect by name (case-sensitive)
      // spec: 10-business-rules/reconnection.md
      const existing = Array.from(s.participants.values()).find(p => p.name === name);
      if (existing) {
        const oldId = existing.id;
        existing.id = socket.id;
        // Retarget activities by participantName
        s.activities.forEach(a => {
          if (a.participantName === name) a.participantId = socket.id;
        });
        socket.join(sessionId);
        socket.emit('session:state', sessionJSON(s));
        return;
      }

      // New engineer
      if (!name || !name.trim()) {
        socket.emit('error', { message: 'Name is required' });
        return;
      }
      // Duplicate name check
      const nameConflict = Array.from(s.participants.values()).some(p => p.name === name);
      if (nameConflict) {
        socket.emit('error', { message: 'Name already taken in this session' });
        return;
      }

      const colorIdx = s.participants.size % AVATAR_COLORS.length;
      const p: Participant = {
        id: socket.id,
        name: name.trim(),
        role: (role as Role) || 'IC',
        joinedAt: new Date(),
        color: AVATAR_COLORS[colorIdx],
        initials: makeInitials(name.trim()),
      };
      s.participants.set(socket.id, p);
      socket.join(sessionId);
      socket.emit('session:state', sessionJSON(s));
      socket.to(sessionId).emit('participant:joined', p);
    });

    // activity:add
    socket.on('activity:add', (data: { sessionId: string; title: string; tpo: TimePerOccurrence; freq: Frequency; energy: Energy }) => {
      const { sessionId, title, tpo, freq, energy } = data;
      const s = sessions.get(sessionId);
      if (!s) return socket.emit('error', { message: 'Session not found' });
      if (s.status !== 'active') return socket.emit('error', { message: 'Activities can only be added during active phase' });
      const p = s.participants.get(socket.id);
      if (!p) return socket.emit('error', { message: 'Participant not found' });
      const act: Activity = {
        id: randomUUID(),
        sessionId,
        participantId: socket.id,
        participantName: p.name,
        participantInitials: p.initials,
        participantColor: p.color,
        title: title.trim(),
        tpo, freq, energy,
        teamAuto: 'unclassified',
        flagged: false,
        discussionNote: '',
        createdAt: new Date(),
        editHistory: [],
        relatedTo: [],
      };
      s.activities.set(act.id, act);
      io.to(sessionId).emit('activity:added', act);
    });

    // activity:update
    socket.on('activity:update', (data: { sessionId: string; activityId: string; title?: string; tpo?: TimePerOccurrence; freq?: Frequency; energy?: Energy }) => {
      const s = sessions.get(data.sessionId);
      if (!s) return;
      const act = s.activities.get(data.activityId);
      if (!act) return;
      if (data.title !== undefined) act.title = data.title.trim();
      if (data.tpo !== undefined) act.tpo = data.tpo;
      if (data.freq !== undefined) act.freq = data.freq;
      if (data.energy !== undefined) act.energy = data.energy;
      act.editedBy = s.participants.get(socket.id)?.name;
      act.editHistory.push({ who: act.editedBy ?? 'unknown', what: 'edited', at: new Date() });
      io.to(data.sessionId).emit('activity:updated', act);
    });

    // activity:delete (soft delete — client side 5s undo; this is the committed delete)
    socket.on('activity:delete', (data: { sessionId: string; activityId: string }) => {
      const s = sessions.get(data.sessionId);
      if (!s) return;
      if (!s.activities.has(data.activityId)) return;
      s.activities.delete(data.activityId);
      io.to(data.sessionId).emit('activity:deleted', { id: data.activityId });
    });

    // session:start (facilitator)
    socket.on('session:start', (data: { sessionId: string; token: string }) => {
      const s = sessions.get(data.sessionId);
      if (!s || data.token !== s.facilitatorToken) return socket.emit('error', { message: 'Unauthorized' });
      if (s.status !== 'lobby') return socket.emit('error', { message: 'Session is not in lobby' });
      s.status = 'active';
      s.startedAt = new Date();
      if (s.submissionWindowMin > 0) startTimer(s.id, io);
      io.to(data.sessionId).emit('session:status', { status: 'active', startedAt: s.startedAt });
    });

    // session:extend — snap-forward on socket (spec: 10-business-rules/timer-rules.md)
    socket.on('session:extend', (data: { sessionId: string; token: string; minutes: number }) => {
      const s = sessions.get(data.sessionId);
      if (!s || data.token !== s.facilitatorToken) return socket.emit('error', { message: 'Unauthorized' });
      if (s.status !== 'active') return socket.emit('error', { message: 'Session is not active' });
      s.submissionWindowMin = (s.submissionWindowMin || 0) + Number(data.minutes);
      // snap-forward: reset timer from NOW
      const endTime = startTimer(s.id, io);
      const remaining = endTime ? Math.floor((endTime.getTime() - Date.now()) / 1000) : 0;
      io.to(data.sessionId).emit('session:extended', { submissionWindowMin: s.submissionWindowMin, remainingSeconds: remaining });
    });

    // session:close → discussion
    socket.on('session:close', (data: { sessionId: string; token: string }) => {
      const s = sessions.get(data.sessionId);
      if (!s || data.token !== s.facilitatorToken) return socket.emit('error', { message: 'Unauthorized' });
      if (s.status !== 'active') return socket.emit('error', { message: 'Session is not active' });
      s.status = 'discussion';
      s.closedAt = new Date();
      clearTimer(s.id);
      io.to(data.sessionId).emit('session:status', { status: 'discussion', closedAt: s.closedAt });
    });

    // session:complete → done
    socket.on('session:complete', (data: { sessionId: string; token: string }) => {
      const s = sessions.get(data.sessionId);
      if (!s || data.token !== s.facilitatorToken) return socket.emit('error', { message: 'Unauthorized' });
      if (s.status !== 'discussion') return socket.emit('error', { message: 'Session is not in discussion' });
      s.status = 'done';
      io.to(data.sessionId).emit('session:status', { status: 'done' });
    });

    // activity:classify (facilitator)
    socket.on('activity:classify', (data: { sessionId: string; token: string; activityId: string; teamAuto: AutoVerdict }) => {
      const s = sessions.get(data.sessionId);
      if (!s || data.token !== s.facilitatorToken) return socket.emit('error', { message: 'Unauthorized' });
      const act = s.activities.get(data.activityId);
      if (!act) return;
      act.teamAuto = data.teamAuto;
      io.to(data.sessionId).emit('activity:updated', act);
    });

    // activity:flag (facilitator)
    socket.on('activity:flag', (data: { sessionId: string; token: string; activityId: string; flagged: boolean }) => {
      const s = sessions.get(data.sessionId);
      if (!s || data.token !== s.facilitatorToken) return socket.emit('error', { message: 'Unauthorized' });
      const act = s.activities.get(data.activityId);
      if (!act) return;
      act.flagged = data.flagged;
      io.to(data.sessionId).emit('activity:updated', act);
    });

    // activity:note (facilitator)
    socket.on('activity:note', (data: { sessionId: string; token: string; activityId: string; note: string }) => {
      const s = sessions.get(data.sessionId);
      if (!s || data.token !== s.facilitatorToken) return socket.emit('error', { message: 'Unauthorized' });
      const act = s.activities.get(data.activityId);
      if (!act) return;
      act.discussionNote = data.note ?? '';
      io.to(data.sessionId).emit('activity:updated', act);
    });

    // activity:merge (facilitator)
    socket.on('activity:merge', (data: { sessionId: string; token: string; sourceIds: string[]; merged: Partial<Activity> }) => {
      const s = sessions.get(data.sessionId);
      if (!s || data.token !== s.facilitatorToken) return socket.emit('error', { message: 'Unauthorized' });
      const sources = data.sourceIds.map(id => s.activities.get(id)).filter(Boolean) as Activity[];
      if (sources.length < 2) return socket.emit('error', { message: 'Need at least 2 source activities' });

      const mergedId = shortId();
      const merged: Activity = {
        id: mergedId,
        sessionId: s.id,
        participantId: sources[0].participantId,
        participantName: sources[0].participantName,
        participantInitials: sources[0].participantInitials,
        participantColor: sources[0].participantColor,
        title: data.merged?.title ?? sources[0].title,
        tpo: data.merged?.tpo ?? sources[0].tpo,
        freq: data.merged?.freq ?? sources[0].freq,
        energy: data.merged?.energy ?? sources[0].energy,
        teamAuto: 'unclassified',
        flagged: false,
        discussionNote: '',
        createdAt: new Date(),
        editHistory: [],
        mergedFromIds: data.sourceIds,
        mergedFromNames: sources.map(a => a.participantName),
        mergedFromInitials: sources.map(a => a.participantInitials),
        mergedFromColors: sources.map(a => a.participantColor),
        reportedBy: sources.map(a => a.participantName),
        reportedByInitials: sources.map(a => a.participantInitials),
        reportedByColors: sources.map(a => a.participantColor),
        relatedTo: [],
      };
      sources.forEach(a => { a.isMergedSource = true; a.mergedIntoId = mergedId; });
      s.activities.set(mergedId, merged);
      io.to(data.sessionId).emit('activity:merged', { merged, updatedSources: sources });
    });

    // activity:relate
    socket.on('activity:relate', (data: { sessionId: string; activityId: string; relatedTo: string[] }) => {
      const s = sessions.get(data.sessionId);
      if (!s) return;
      const act = s.activities.get(data.activityId);
      if (!act) return;
      act.relatedTo = Array.isArray(data.relatedTo) ? data.relatedTo : [];
      io.to(data.sessionId).emit('activity:updated', act);
    });

    // session:settings (facilitator broadcasts new settings to room)
    socket.on('session:settings', (data: { sessionId: string; token: string; settings: Partial<Pick<Session, 'submissionWindowMin' | 'liveTeamFeed' | 'enabledCategories'>> }) => {
      const s = sessions.get(data.sessionId);
      if (!s || data.token !== s.facilitatorToken) return socket.emit('error', { message: 'Unauthorized' });
      if (s.status !== 'lobby') return;
      if (data.settings.submissionWindowMin !== undefined) s.submissionWindowMin = data.settings.submissionWindowMin;
      if (data.settings.liveTeamFeed !== undefined) s.liveTeamFeed = data.settings.liveTeamFeed;
      if (data.settings.enabledCategories?.length) s.enabledCategories = data.settings.enabledCategories;
      io.to(data.sessionId).emit('session:settings', { submissionWindowMin: s.submissionWindowMin, liveTeamFeed: s.liveTeamFeed, enabledCategories: s.enabledCategories });
    });

    // disconnect — remove participant from session
    socket.on('disconnect', () => {
      sessions.forEach((s, sessionId) => {
        const p = s.participants.get(socket.id);
        if (p) {
          s.participants.delete(socket.id);
          socket.to(sessionId).emit('participant:left', { id: socket.id, name: p.name });
        }
        if (s.facilitatorId === socket.id) {
          s.facilitatorId = '';
        }
      });
    });
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

app.prepare().then(() => {
  const expressApp = express();
  expressApp.use(express.json());

  const httpServer = createServer(expressApp);
  const io = new SocketIO(httpServer, { cors: { origin: '*' } });

  setupMCP(expressApp);
  setupSessionRoutes(expressApp);
  setupActivityRoutes(expressApp, io);
  setupSocket(io);

  // Next.js catch-all
  expressApp.all('*', (req: Request, res: Response) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(port, () => {
    console.log(`> Work Audit ready on http://localhost:${port}`);
  });
});
```

- [ ] **Step 2: Replace src/mcp.ts with Work Audit MCP tools**

Replace `src/mcp.ts` with:

```typescript
import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import sessions from './store';
import { effortHrsPerWk, effortDisplay, perceivedCost } from './store';

// spec: 07-mcp-server/tools.md — 4 read-only tools; no auth

const buildServer = () => {
  const server = new McpServer({ name: 'work-audit', version: '0.1.0' });

  // list_sessions
  server.tool('list_sessions', 'List all active Work Audit sessions.', {}, async () => ({
    content: [{
      type: 'text',
      text: JSON.stringify(
        Array.from(sessions.values()).map(s => ({
          id: s.id, name: s.name, status: s.status,
          participants: s.participants.size,
          activities: s.activities.size,
          createdAt: s.createdAt,
        })),
        null, 2
      ),
    }],
  }));

  // get_session
  server.tool(
    'get_session',
    'Get full state of a Work Audit session, including all participants and activities.',
    { sessionId: z.string().describe('8-character session ID') },
    async ({ sessionId }) => {
      const s = sessions.get(sessionId);
      if (!s) return { content: [{ type: 'text', text: 'Session not found.' }] };
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ...s,
            participants: Array.from(s.participants.values()),
            activities: Array.from(s.activities.values()),
          }, null, 2),
        }],
      };
    }
  );

  // export_session_markdown — spec: 07-mcp-server/tools.md (simpler 5-section format)
  server.tool(
    'export_session_markdown',
    'Export a Work Audit session as a Markdown priority report.',
    { sessionId: z.string().describe('8-character session ID') },
    async ({ sessionId }) => {
      const s = sessions.get(sessionId);
      if (!s) return { content: [{ type: 'text', text: 'Session not found.' }] };

      const acts = Array.from(s.activities.values());
      const flagged   = acts.filter(a => a.flagged);
      const auto      = acts.filter(a => a.teamAuto === 'yes');
      const maybe     = acts.filter(a => a.teamAuto === 'maybe');
      const manual    = acts.filter(a => a.teamAuto === 'no');
      const unclassed = acts.filter(a => a.teamAuto === 'unclassified');

      const fmtAct = (a: typeof acts[0]) =>
        `- **${a.title}** — ${a.participantName} · ${a.tpo} · ${a.freq} · ${a.energy}${a.flagged ? ' ★' : ''}${a.discussionNote ? `\n  _${a.discussionNote}_` : ''}`;

      const md = [
        `# Work Audit · ${s.name}`,
        `${s.facilitatorName || 'Unknown facilitator'} · ${acts.length} activities · ${s.participants.size} participants`,
        '',
        `## ★ Flagged priorities (${flagged.length})`,
        flagged.length ? flagged.map(fmtAct).join('\n') : '_None_',
        '',
        `## Automatable (${auto.length})`,
        auto.length ? auto.map(fmtAct).join('\n') : '_None_',
        '',
        `## Maybe automatable (${maybe.length})`,
        maybe.length ? maybe.map(fmtAct).join('\n') : '_None_',
        '',
        `## Manual forever (${manual.length})`,
        manual.length ? manual.map(fmtAct).join('\n') : '_None_',
        '',
        `## Unclassified (${unclassed.length})`,
        unclassed.length ? unclassed.map(fmtAct).join('\n') : '_None_',
        '',
        '---',
        '_Automatability classified by team during discussion — not self-report._',
      ].join('\n');

      return { content: [{ type: 'text', text: md }] };
    }
  );

  // list_activities — with filter
  server.tool(
    'list_activities',
    'List activities from a Work Audit session, optionally filtered.',
    {
      sessionId: z.string().describe('8-character session ID'),
      filter: z.enum(['all', 'flagged', 'automatable', 'draining']).optional().describe('Filter: all (default), flagged, automatable (teamAuto=yes), draining (energy=draining)'),
    },
    async ({ sessionId, filter = 'all' }) => {
      const s = sessions.get(sessionId);
      if (!s) return { content: [{ type: 'text', text: 'Session not found.' }] };

      let acts = Array.from(s.activities.values());
      if (filter === 'flagged')     acts = acts.filter(a => a.flagged);
      if (filter === 'automatable') acts = acts.filter(a => a.teamAuto === 'yes');
      if (filter === 'draining')    acts = acts.filter(a => a.energy === 'draining');

      return { content: [{ type: 'text', text: JSON.stringify(acts, null, 2) }] };
    }
  );

  return server;
};

export const setupMCP = (app: Express) => {
  app.post('/mcp', async (req: Request, res: Response) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
npx tsc --noEmit 2>&1 | head -40
```

Expected: Zero errors or only errors in app/ files (not yet written). Fix any errors in server.ts / mcp.ts / store.ts before proceeding.

- [ ] **Step 4: Start server and smoke-test endpoints**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
npm run dev &
sleep 5

# Create a session
curl -s -X POST http://localhost:3070/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Session","submissionWindowMin":10,"liveTeamFeed":true,"enabledCategories":["meetings","on-call"]}' | jq .

# Should return 201 with id, facilitatorToken, status=lobby
```

Expected: JSON response with `id` (8 chars), `facilitatorToken` (UUID), `status: "lobby"`.

- [ ] **Step 5: Commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add src/server.ts src/mcp.ts
git commit -m "feat: implement Work Audit REST API, socket events, and MCP tools"
```

---

## Task 3: Design System — `app/globals.css` + Layout

**Files:**
- Modify: `app/globals.css` (full replacement)
- Modify: `app/layout.tsx` (add fonts + metadata)

This task implements the full `wa-*` CSS design system from `spec/09-design-system/`.

- [ ] **Step 1: Replace app/globals.css with Work Audit design system**

Replace the entire file with:

```css
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Color tokens — spec: 09-design-system/color-tokens.md ─────────────────── */
:root {
  /* Base */
  --paper:  #f5f0e8;
  --cream:  #ede8dc;
  --ink:    #1a1714;
  --muted:  #6b6660;
  --border: #d4cec4;

  /* Accents */
  --rust:   #b14d2f;
  --sage:   #6b7d5a;
  --amber:  #c8945f;
  --slate:  #5a7a8a;
  --flag:   #d4822a;

  /* teamAuto tones */
  --tone-yes:           #6b7d5a;
  --tone-maybe:         #c8945f;
  --tone-no:            #b14d2f;
  --tone-unclassified:  #6b6660;

  /* Effort pill thresholds — spec: 02-data-model/calculations.md */
  --effort-low:    #6b7d5a; /* < 1.5 h/wk — sage */
  --effort-mid:    #c8945f; /* < 4   h/wk — amber */
  --effort-high:   #b14d2f; /* ≥ 4   h/wk — rust */

  /* Quadrant tints */
  --q-automate:  #e8f0e4; /* low effort, high energy drain */
  --q-delegate:  #f5eee4;
  --q-simplify:  #e4ecf0;
  --q-accept:    #f0ece4;
}

/* ── Typography — spec: 09-design-system/typography.md ─────────────────────── */
body {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: var(--paper);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.wa-display {
  font-family: 'Newsreader', Georgia, serif;
  font-size: 2rem;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.wa-heading {
  font-family: 'Newsreader', Georgia, serif;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
}

.wa-eyebrow {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.wa-mono {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
}

.wa-num {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.1rem;
  font-weight: 500;
}

/* ── Layout — spec: 09-design-system/layout-patterns.md ────────────────────── */
.wa-screen {
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--paper);
}

.wa-topbar {
  height: 53px;
  min-height: 53px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 1.25rem;
  gap: 1rem;
  background: var(--paper);
  flex-shrink: 0;
}

.wa-main {
  flex: 1;
  overflow: hidden;
  display: flex;
}

/* Two-column layout (join, create, lobby) */
.wa-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100%;
}

/* Three-column engineer board — spec: 09-design-system/layout-patterns.md */
.wa-3col-eng {
  display: grid;
  grid-template-columns: 220px 1fr 296px;
  height: 100%;
  overflow: hidden;
}

/* Three-column facilitator live view */
.wa-3col-fac {
  display: grid;
  grid-template-columns: 260px 1fr auto;
  height: 100%;
  overflow: hidden;
}

.wa-col {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wa-col-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

/* ── Components — spec: 09-design-system/components.md ─────────────────────── */

/* Cards */
.wa-card {
  background: var(--cream);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.wa-card:hover {
  border-color: var(--muted);
}

/* Activity card */
.wa-activity {
  background: var(--cream);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  cursor: default;
  position: relative;
}

.wa-activity--flagged {
  border-left: 3px solid var(--flag);
}

.wa-activity--merged-source {
  opacity: 0.5;
}

/* Chips (tpo/freq/energy/teamAuto) */
.wa-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  font-weight: 500;
  border: 1px solid currentColor;
  white-space: nowrap;
}

.wa-chip--tpo    { color: var(--slate); border-color: var(--slate); }
.wa-chip--freq   { color: var(--muted); border-color: var(--border); }
.wa-chip--energy { color: var(--amber); border-color: var(--amber); }

/* Effort pill — spec: 02-data-model/calculations.md */
.wa-effort-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  font-weight: 500;
  color: white;
}

.wa-effort-pill--low  { background: var(--effort-low); }
.wa-effort-pill--mid  { background: var(--effort-mid); }
.wa-effort-pill--high { background: var(--effort-high); }

/* teamAuto classify buttons */
.wa-classify-btn {
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}

.wa-classify-btn--yes  { border-color: var(--tone-yes);  color: var(--tone-yes); }
.wa-classify-btn--yes.active  { background: var(--tone-yes);  color: white; }
.wa-classify-btn--maybe{ border-color: var(--tone-maybe); color: var(--tone-maybe); }
.wa-classify-btn--maybe.active{ background: var(--tone-maybe); color: white; }
.wa-classify-btn--no   { border-color: var(--tone-no);   color: var(--tone-no); }
.wa-classify-btn--no.active   { background: var(--tone-no);   color: white; }

/* Verdict chip (discussion view) */
.wa-verdict {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
}

.wa-verdict--yes           { background: var(--tone-yes); }
.wa-verdict--maybe         { background: var(--tone-maybe); }
.wa-verdict--no            { background: var(--tone-no); }
.wa-verdict--unclassified  { background: var(--tone-unclassified); }

/* Avatar */
.wa-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

/* Inputs */
.wa-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: white;
  color: var(--ink);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}

.wa-input:focus {
  border-color: var(--slate);
}

.wa-input--error {
  border-color: var(--rust);
}

/* Buttons */
.wa-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.wa-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.wa-btn--primary {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}

.wa-btn--secondary {
  background: transparent;
  color: var(--ink);
  border-color: var(--border);
}

.wa-btn--danger {
  background: var(--rust);
  color: white;
  border-color: var(--rust);
}

.wa-btn--ghost {
  background: transparent;
  color: var(--muted);
  border-color: transparent;
  padding: 0.35rem 0.5rem;
  font-size: 0.8rem;
}

.wa-btn--ghost:hover { background: var(--cream); color: var(--ink); }

/* Toggle */
.wa-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: var(--border);
  border: none;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.wa-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
}

.wa-toggle--on { background: var(--sage); }
.wa-toggle--on::after { transform: translateX(16px); }

/* QStrip — inline chip selector */
.wa-qstrip {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.wa-qstrip-option {
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s;
  color: var(--muted);
}

.wa-qstrip-option:hover { border-color: var(--muted); color: var(--ink); }

.wa-qstrip-option--selected {
  background: var(--ink);
  border-color: var(--ink);
  color: white;
}

/* QuestionBlock */
.wa-question-block {
  margin-bottom: 1rem;
}

.wa-question-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 0.4rem;
}

/* Modal */
.wa-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 23, 20, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.wa-modal {
  background: var(--paper);
  border-radius: 8px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.wa-modal--md { width: 760px; max-width: 100%; }
.wa-modal--lg { width: 900px; max-width: 100%; }
.wa-modal--xl { width: 860px; max-width: 100%; }

.wa-modal-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.wa-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.wa-modal-footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* Matrix canvas */
.wa-matrix {
  position: relative;
  background: white;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

/* Matrix dot */
.wa-dot-activity {
  position: absolute;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6rem;
  font-weight: 600;
  color: white;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform 0.1s;
  border: 2px solid transparent;
}

.wa-dot-activity--flagged {
  width: 36px;
  height: 36px;
  border-color: var(--flag);
}

.wa-dot-activity:hover { transform: translate(-50%, -50%) scale(1.15); }

/* Undo toast — spec: 10-business-rules/soft-delete.md */
.wa-undo-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink);
  color: var(--paper);
  padding: 0.6rem 1rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.85rem;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.wa-undo-toast button {
  background: none;
  border: none;
  color: var(--amber);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
}

/* Prompt rail — spec: 03-engineer-flow/prompt-rail.md */
.wa-prompt-rail {
  background: var(--cream);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 0.75rem;
}

.wa-prompt-category {
  margin-bottom: 0.5rem;
}

.wa-prompt-category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ink);
}

.wa-prompt-category-header:hover { background: var(--border); }

.wa-prompt-example {
  display: block;
  padding: 0.25rem 0.5rem 0.25rem 1rem;
  font-size: 0.75rem;
  color: var(--muted);
  cursor: pointer;
  border-radius: 3px;
}

.wa-prompt-example:hover { background: var(--border); color: var(--ink); }

/* Timer — spec: 10-business-rules/timer-rules.md */
.wa-timer {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  color: var(--muted);
}

.wa-timer--urgent {
  color: var(--rust);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

/* Tabs */
.wa-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--paper);
  flex-shrink: 0;
}

.wa-tab {
  padding: 0.6rem 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
}

.wa-tab:hover { color: var(--ink); }
.wa-tab--active { color: var(--ink); border-bottom-color: var(--ink); }

/* Sidebar */
.wa-sidebar {
  background: var(--cream);
  border-left: 1px solid var(--border);
  overflow-y: auto;
  padding: 0.75rem;
  min-width: 260px;
}

/* Tag / category chip */
.wa-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  background: var(--cream);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.7rem;
  color: var(--muted);
  cursor: pointer;
}

.wa-tag--selected {
  background: var(--ink);
  border-color: var(--ink);
  color: white;
}

/* Progress bar */
.wa-progress {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.wa-progress-fill {
  height: 100%;
  background: var(--sage);
  transition: width 0.3s;
}

/* Flag star */
.wa-flag {
  color: var(--flag);
  font-size: 0.85rem;
}

/* Section header */
.wa-section-header {
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Separator */
.wa-sep {
  height: 1px;
  background: var(--border);
  margin: 0.75rem 0;
}

/* Status badge */
.wa-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.wa-status-badge--lobby      { background: var(--cream); color: var(--muted); border: 1px solid var(--border); }
.wa-status-badge--active     { background: var(--sage);  color: white; }
.wa-status-badge--discussion { background: var(--slate); color: white; }
.wa-status-badge--done       { background: var(--muted); color: white; }

/* Responsive — spec: 11-non-functional: mobile for join + engineer board */
@media (max-width: 768px) {
  .wa-2col { grid-template-columns: 1fr; }
  .wa-3col-eng {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
  .wa-prompt-rail { display: none; }
}
```

- [ ] **Step 2: Update app/layout.tsx**

Replace with:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Work Audit',
  description: 'Real-time collaborative work audit for engineering teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify CSS loads**

Start the dev server and check `http://localhost:3070` loads without CSS errors.

- [ ] **Step 4: Commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add app/globals.css app/layout.tsx
git commit -m "feat: implement Work Audit wa-* design system and CSS tokens"
```

---

## Task 4: Shared Primitives + Categories + Socket

**Files:**
- Create: `app/components/Primitives.tsx`
- Create: `lib/categories.ts`
- Modify: `lib/socket.ts`

- [ ] **Step 1: Create lib/categories.ts**

Create `lib/categories.ts`:

```typescript
// spec: 03-engineer-flow/prompt-rail.md — 9 categories, first 3 expanded by default
// spec: 02-data-model/session.md — enabledCategories

export type PromptExample = {
  title: string;
  tpo: string;
  freq: string;
};

export type PromptCategory = {
  id: string;
  label: string;
  examples: PromptExample[];
};

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'meetings',
    label: 'Meetings & syncs',
    examples: [
      { title: 'Weekly team standup', tpo: '<30m', freq: 'daily' },
      { title: 'Sprint planning', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Quarterly planning', tpo: 'half-day', freq: 'quarterly' },
    ],
  },
  {
    id: 'on-call',
    label: 'On-call & incidents',
    examples: [
      { title: 'Responding to pages', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Incident postmortems', tpo: '30m-2h', freq: 'monthly' },
      { title: 'Runbook updates after incident', tpo: '<30m', freq: 'monthly' },
    ],
  },
  {
    id: 'code-review',
    label: 'Code review',
    examples: [
      { title: 'Reviewing pull requests', tpo: '30m-2h', freq: 'daily' },
      { title: 'Addressing review comments', tpo: '<30m', freq: 'daily' },
      { title: 'Reviewing large migrations', tpo: 'half-day', freq: 'monthly' },
    ],
  },
  {
    id: 'deployments',
    label: 'Deployments & releases',
    examples: [
      { title: 'Deploying to production', tpo: '<30m', freq: 'weekly' },
      { title: 'Manual release coordination', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Hotfix deployment', tpo: '30m-2h', freq: 'monthly' },
    ],
  },
  {
    id: 'data',
    label: 'Data & reporting',
    examples: [
      { title: 'Weekly metrics report', tpo: '<30m', freq: 'weekly' },
      { title: 'Data pipeline monitoring', tpo: '<30m', freq: 'daily' },
      { title: 'Ad-hoc data queries', tpo: '30m-2h', freq: 'adhoc' },
    ],
  },
  {
    id: 'support',
    label: 'Internal support',
    examples: [
      { title: 'Answering Slack questions', tpo: '30m-2h', freq: 'daily' },
      { title: 'Debugging production issues for other teams', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Onboarding new engineers', tpo: 'half-day', freq: 'monthly' },
    ],
  },
  {
    id: 'toil',
    label: 'Toil & manual work',
    examples: [
      { title: 'Manual environment provisioning', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Updating config files manually', tpo: '<30m', freq: 'weekly' },
      { title: 'Database migrations by hand', tpo: 'half-day', freq: 'monthly' },
    ],
  },
  {
    id: 'planning',
    label: 'Planning & docs',
    examples: [
      { title: 'Writing design docs', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Updating runbooks', tpo: '<30m', freq: 'weekly' },
      { title: 'Roadmap planning sessions', tpo: 'half-day', freq: 'quarterly' },
    ],
  },
  {
    id: 'other',
    label: 'Other recurring work',
    examples: [
      { title: 'Dependency upgrades', tpo: '30m-2h', freq: 'monthly' },
      { title: 'Performance profiling', tpo: '30m-2h', freq: 'monthly' },
      { title: 'Security scanning', tpo: '<30m', freq: 'weekly' },
    ],
  },
];

export const DEFAULT_ENABLED_CATEGORIES = PROMPT_CATEGORIES.map(c => c.id);
```

- [ ] **Step 2: Update lib/socket.ts**

Replace with:

```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ autoConnect: false });
  }
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

- [ ] **Step 3: Create app/components/Primitives.tsx**

Create `app/components/Primitives.tsx`:

```tsx
'use client';

// Shared types, helpers, and UI building blocks
// Mirrors store.ts types for client-side use
// spec: 02-data-model/*, 09-design-system/components.md

import React from 'react';

// ── Types (client-side mirrors of store.ts) ────────────────────────────────

export type TimePerOccurrence = '<30m' | '30m-2h' | 'half-day' | 'day+';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
export type Energy = 'energizing' | 'fine' | 'tedious' | 'draining';
export type AutoVerdict = 'yes' | 'maybe' | 'no' | 'unclassified';
export type SessionStatus = 'lobby' | 'active' | 'discussion' | 'done';
export type Role = 'IC' | 'EM' | 'PM' | 'UX' | 'Other';

export type Participant = {
  id: string;
  name: string;
  role: Role;
  joinedAt: string;
  color: string;
  initials: string;
};

export type Activity = {
  id: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  participantInitials: string;
  participantColor: string;
  title: string;
  tpo: TimePerOccurrence;
  freq: Frequency;
  energy: Energy;
  teamAuto: AutoVerdict;
  flagged: boolean;
  discussionNote: string;
  createdAt: string;
  editedBy?: string;
  editHistory: Array<{ who: string; what: string; at: string }>;
  mergedFromIds?: string[];
  mergedFromNames?: string[];
  mergedFromInitials?: string[];
  mergedFromColors?: string[];
  reportedBy?: string[];
  reportedByInitials?: string[];
  reportedByColors?: string[];
  mergedIntoId?: string;
  isMergedSource?: boolean;
  relatedTo?: string[];
};

export type Session = {
  id: string;
  name: string;
  facilitatorId: string;
  facilitatorName: string;
  status: SessionStatus;
  submissionWindowMin: number;
  liveTeamFeed: boolean;
  recallPrompts: string[];
  enabledCategories: string[];
  createdAt: string;
  startedAt?: string;
  closedAt?: string;
  participants: Participant[];
  activities: Activity[];
};

// ── Label maps — spec: 02-data-model/enumerations.md ──────────────────────

export const TPO_LABELS: Record<TimePerOccurrence, string> = {
  '<30m': '<30m', '30m-2h': '30m–2h', 'half-day': 'Half day', 'day+': 'Day+',
};

export const FREQ_LABELS: Record<Frequency, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', adhoc: 'Ad hoc',
};

export const ENERGY_LABELS: Record<Energy, string> = {
  energizing: 'Energizing', fine: 'Fine', tedious: 'Tedious', draining: 'Draining',
};

export const VERDICT_LABELS: Record<AutoVerdict, string> = {
  yes: 'Automate', maybe: 'Maybe', no: 'Keep human', unclassified: 'Unclassified',
};

// ── Calculations — spec: 02-data-model/calculations.md ────────────────────

const TPO_HOURS: Record<TimePerOccurrence, number> = {
  '<30m': 0.5, '30m-2h': 1.25, 'half-day': 4, 'day+': 8,
};

const FREQ_PER_WK: Record<Frequency, number> = {
  daily: 5, weekly: 1, monthly: 0.23, quarterly: 0.077, adhoc: 0.3,
};

const ENERGY_MULT: Record<Energy, number> = {
  energizing: 0.5, fine: 1.0, tedious: 1.5, draining: 2.0,
};

export function calcEffort(a: Pick<Activity, 'tpo' | 'freq'>): number {
  return TPO_HOURS[a.tpo] * FREQ_PER_WK[a.freq];
}

export function calcPerceivedCost(a: Pick<Activity, 'tpo' | 'freq' | 'energy'>): number {
  return calcEffort(a) * ENERGY_MULT[a.energy];
}

export function effortDisplay(hrs: number): string {
  if (hrs < 1)   return '<1 h/wk';
  if (hrs < 1.5) return '~1 h/wk';
  if (hrs < 3)   return `~${hrs.toFixed(1)} h/wk`;
  if (hrs < 8)   return `~${Math.round(hrs)} h/wk`;
  return '8+ h/wk';
}

export function effortPillClass(hrs: number): string {
  if (hrs < 1.5) return 'wa-effort-pill wa-effort-pill--low';
  if (hrs < 4)   return 'wa-effort-pill wa-effort-pill--mid';
  return 'wa-effort-pill wa-effort-pill--high';
}

// spec: 02-data-model/calculations.md — matrix coordinates
export function matrixCoords(a: Pick<Activity, 'tpo' | 'freq' | 'energy'>): { x: number; y: number } {
  const h = calcEffort(a);
  const x = Math.min(92, Math.sqrt(h / 12) * 100);
  const yMap: Record<Energy, number> = { draining: 12, tedious: 37, fine: 63, energizing: 88 };
  return { x, y: yMap[a.energy] };
}

// spec: 09-design-system/components.md — cluster dots within 5px of each other
export function clusterMatrixPositions(
  activities: Activity[],
  containerW: number,
  containerH: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const CLUSTER_RADIUS = 5;
  const DOT_SIZE = 30;

  activities.forEach(act => {
    const { x: xPct, y: yPct } = matrixCoords(act);
    let px = (xPct / 100) * containerW;
    let py = ((100 - yPct) / 100) * containerH; // flip Y (top = high energy drain)

    // Nudge if overlapping
    let attempts = 0;
    while (attempts < 20) {
      let overlapping = false;
      positions.forEach(pos => {
        const dx = px - pos.x;
        const dy = py - pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < DOT_SIZE) {
          overlapping = true;
          const angle = Math.atan2(dy, dx);
          px += Math.cos(angle) * CLUSTER_RADIUS;
          py += Math.sin(angle) * CLUSTER_RADIUS;
        }
      });
      if (!overlapping) break;
      attempts++;
    }

    // Clamp to container
    px = Math.max(DOT_SIZE / 2, Math.min(containerW - DOT_SIZE / 2, px));
    py = Math.max(DOT_SIZE / 2, Math.min(containerH - DOT_SIZE / 2, py));
    positions.set(act.id, { x: px, y: py });
  });

  return positions;
}

// Jaccard similarity for suggestions/merge
export function titleSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const aWords = new Set(tokenize(a));
  const bWords = new Set(tokenize(b));
  if (aWords.size === 0 && bWords.size === 0) return 0;
  const intersection = [...aWords].filter(w => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union > 0 ? intersection / union : 0;
}

// ── UI Components ──────────────────────────────────────────────────────────

/** Avatar circle with initials */
export function Avatar({ initials, color, size = 28 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="wa-avatar"
      style={{ background: color, width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

/** Effort pill — colored by threshold */
export function EffortPill({ activity }: { activity: Pick<Activity, 'tpo' | 'freq'> }) {
  const hrs = calcEffort(activity);
  return (
    <span className={effortPillClass(hrs)}>
      {effortDisplay(hrs)}
    </span>
  );
}

/** Compact chip row: tpo · freq · energy */
export function ActivityChipsShort({ activity }: { activity: Pick<Activity, 'tpo' | 'freq' | 'energy'> }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      <span className="wa-chip wa-chip--tpo">{TPO_LABELS[activity.tpo]}</span>
      <span className="wa-chip wa-chip--freq">{FREQ_LABELS[activity.freq]}</span>
      <span className="wa-chip wa-chip--energy">{ENERGY_LABELS[activity.energy]}</span>
      <EffortPill activity={activity} />
    </div>
  );
}

/** Verdict chip (discussion view) */
export function VerdictChip({ verdict }: { verdict: AutoVerdict }) {
  return (
    <span className={`wa-verdict wa-verdict--${verdict}`}>
      {VERDICT_LABELS[verdict]}
    </span>
  );
}

/** QStrip — inline chip selector for tpo/freq/energy */
export function QStrip<T extends string>({
  options, value, onChange, labelMap,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labelMap: Record<T, string>;
}) {
  return (
    <div className="wa-qstrip">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          className={`wa-qstrip-option${value === opt ? ' wa-qstrip-option--selected' : ''}`}
          onClick={() => onChange(opt)}
        >
          {labelMap[opt]}
        </button>
      ))}
    </div>
  );
}

/** QuestionBlock: label + QStrip */
export function QuestionBlock<T extends string>({
  label, options, value, onChange, labelMap,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labelMap: Record<T, string>;
}) {
  return (
    <div className="wa-question-block">
      <div className="wa-question-label">{label}</div>
      <QStrip options={options} value={value} onChange={onChange} labelMap={labelMap} />
    </div>
  );
}

/** Classify buttons (yes/maybe/no) */
export function ClassifyBtn({
  current, onClassify,
}: {
  current: AutoVerdict;
  onClassify: (v: AutoVerdict) => void;
}) {
  const opts: AutoVerdict[] = ['yes', 'maybe', 'no'];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {opts.map(v => (
        <button
          key={v}
          type="button"
          className={`wa-classify-btn wa-classify-btn--${v}${current === v ? ' active' : ''}`}
          onClick={() => onClassify(current === v ? 'unclassified' : v)}
        >
          {VERDICT_LABELS[v]}
        </button>
      ))}
    </div>
  );
}

/** Timer display — spec: 10-business-rules/timer-rules.md */
export function TimerDisplay({ remainingSeconds }: { remainingSeconds: number }) {
  const urgent = remainingSeconds <= 120 && remainingSeconds > 0;
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const label = remainingSeconds <= 0
    ? 'Time up'
    : `${mins}:${secs.toString().padStart(2, '0')}`;
  return (
    <span className={`wa-timer${urgent ? ' wa-timer--urgent' : ''}`}>
      {label}
    </span>
  );
}

/** Status badge */
export function StatusBadge({ status }: { status: SessionStatus }) {
  const labels: Record<SessionStatus, string> = {
    lobby: 'Lobby', active: 'Active', discussion: 'Discussion', done: 'Done',
  };
  return (
    <span className={`wa-status-badge wa-status-badge--${status}`}>
      {labels[status]}
    </span>
  );
}

/** Toggle */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`wa-toggle${on ? ' wa-toggle--on' : ''}`}
        onClick={() => onChange(!on)}
      />
      {label && <span style={{ fontSize: '0.85rem' }}>{label}</span>}
    </label>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add app/components/Primitives.tsx lib/categories.ts lib/socket.ts
git commit -m "feat: add shared Primitives, categories data, and socket client"
```

---

## Task 5: Home Page — Create Session (Facilitator)

**Files:**
- Modify: `app/page.tsx` (full replacement)

Spec: `spec/04-facilitator-flow/create-session.md`

- [ ] **Step 1: Replace app/page.tsx**

Replace with:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROMPT_CATEGORIES, DEFAULT_ENABLED_CATEGORIES } from '@/lib/categories';

const WINDOW_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: 'Untimed', value: 0 },
];

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('Platform team · Q2 audit');
  const [windowMin, setWindowMin] = useState(10);
  const [liveTeamFeed, setLiveTeamFeed] = useState(true);
  const [enabledCategories, setEnabledCategories] = useState<string[]>(DEFAULT_ENABLED_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleCategory(id: string) {
    setEnabledCategories(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Session name is required'); return; }
    if (enabledCategories.length === 0) { setError('Select at least one category'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), submissionWindowMin: windowMin, liveTeamFeed, enabledCategories }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to create session'); return; }
      const session = await res.json();
      // Store facilitator token
      localStorage.setItem(`wa-facilitator-token-${session.id}`, session.facilitatorToken);
      router.push(`/session/${session.id}/lobby?token=${session.facilitatorToken}`);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wa-screen">
      <div className="wa-topbar">
        <span className="wa-eyebrow">Work Audit</span>
      </div>
      <div className="wa-main" style={{ justifyContent: 'center', alignItems: 'flex-start', padding: '3rem 1rem', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div className="wa-display" style={{ marginBottom: '0.25rem' }}>New session</div>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Set up a collaborative work audit for your team.
          </p>

          {/* Session name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="wa-question-label" style={{ display: 'block', marginBottom: 6 }}>
              Session name
            </label>
            <input
              className="wa-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Platform team · Q2 audit"
            />
          </div>

          {/* Submission window */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="wa-question-label" style={{ marginBottom: 6 }}>Submission window</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {WINDOW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`wa-qstrip-option${windowMin === opt.value ? ' wa-qstrip-option--selected' : ''}`}
                  onClick={() => setWindowMin(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="wa-question-label" style={{ marginBottom: 6 }}>
              Activity categories ({enabledCategories.length} enabled)
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PROMPT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`wa-tag${enabledCategories.includes(cat.id) ? ' wa-tag--selected' : ''}`}
                  onClick={() => toggleCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live team feed */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Live team feed</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Engineers see each other&apos;s activities in real time</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={liveTeamFeed}
              className={`wa-toggle${liveTeamFeed ? ' wa-toggle--on' : ''}`}
              onClick={() => setLiveTeamFeed(v => !v)}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--rust)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>
          )}

          <button className="wa-btn wa-btn--primary" style={{ width: '100%' }} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating…' : 'Create session'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Navigate to `http://localhost:3070` and confirm the create session form renders with the correct default name, window options, 9 category chips, and live feed toggle.

- [ ] **Step 3: Test session creation**

Fill in the form and click Create. Verify it redirects to `/session/{id}/lobby?token=...` (will 404 until lobby page is built, but redirect must happen).

- [ ] **Step 4: Commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add app/page.tsx
git commit -m "feat: implement create session home page"
```

---

## Task 6: Smart Router + Join Screen

**Files:**
- Create: `app/session/[id]/page.tsx` (smart router)
- Create: `app/session/[id]/join/page.tsx` (engineer join screen)

Spec: `spec/03-engineer-flow/join-screen.md`, `spec/01-overview/user-roles.md`

- [ ] **Step 1: Create app/session/[id]/page.tsx**

```tsx
'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

// Smart router: redirect facilitator (has token) to facilitator hub,
// or engineer to join (or board if already joined)
// spec: 01-overview/user-roles.md
export default function SessionRouter() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id;

  useEffect(() => {
    const token = searchParams.get('token')
      ?? localStorage.getItem(`wa-facilitator-token-${id}`);

    if (token) {
      // Facilitator
      router.replace(`/session/${id}/facilitator?token=${token}`);
      return;
    }

    // Engineer: check if already joined
    const savedName = localStorage.getItem(`wa-eng-name-${id}`);
    if (savedName) {
      router.replace(`/session/${id}/board`);
    } else {
      router.replace(`/session/${id}/join`);
    }
  }, [id, router, searchParams]);

  return (
    <div className="wa-screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading…</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create app/session/[id]/join/page.tsx**

```tsx
'use client';

// Engineer join screen — spec: 03-engineer-flow/join-screen.md
// Two-column layout; name + role; duplicate name warning; localStorage persistence

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const ROLES = ['IC', 'EM', 'PM', 'UX', 'Other'] as const;
type Role = typeof ROLES[number];

const TRUST_BULLETS = [
  'Your name is only visible to teammates in this session',
  'Nothing is stored beyond this browser session',
  'The facilitator sees all activities; peers see them only if the live feed is on',
];

export default function JoinPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sessionName, setSessionName] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('IC');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    // Load saved name/role
    const savedName = localStorage.getItem(`wa-eng-name-${id}`);
    const savedRole = localStorage.getItem(`wa-eng-role-${id}`) as Role | null;
    if (savedName) setName(savedName);
    if (savedRole && ROLES.includes(savedRole)) setRole(savedRole);

    // Fetch session info
    fetch(`/api/sessions/${id}`)
      .then(r => r.json())
      .then(s => { if (s.name) setSessionName(s.name); })
      .catch(() => setFetchError('Session not found'));
  }, [id]);

  async function handleJoin() {
    if (!name.trim()) { setNameError('Please enter your name'); return; }
    setLoading(true);
    setNameError('');

    // Check for duplicate name
    try {
      const res = await fetch(`/api/sessions/${id}`);
      const session = await res.json();
      if (!res.ok) { setFetchError(session.error || 'Session not found'); setLoading(false); return; }

      const duplicate = session.participants?.some(
        (p: { name: string }) => p.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (duplicate) {
        setNameError('This name is already taken in this session');
        setLoading(false);
        return;
      }

      // Persist to localStorage
      localStorage.setItem(`wa-eng-name-${id}`, name.trim());
      localStorage.setItem(`wa-eng-role-${id}`, role);
      router.push(`/session/${id}/board`);
    } catch {
      setFetchError('Network error — please try again');
      setLoading(false);
    }
  }

  if (fetchError) {
    return (
      <div className="wa-screen">
        <div className="wa-topbar"><span className="wa-eyebrow">Work Audit</span></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="wa-display" style={{ marginBottom: 8 }}>Session not found</div>
            <p style={{ color: 'var(--muted)' }}>{fetchError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wa-screen">
      <div className="wa-topbar">
        <span className="wa-eyebrow">Work Audit</span>
        {sessionName && <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>· {sessionName}</span>}
      </div>
      <div className="wa-main wa-2col">
        {/* Left: trust / info */}
        <div style={{ padding: '3rem 2rem', background: 'var(--cream)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="wa-eyebrow" style={{ marginBottom: '0.75rem' }}>You&apos;re joining</div>
          <div className="wa-display" style={{ marginBottom: '1.5rem' }}>{sessionName || 'Work Audit'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TRUST_BULLETS.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--sage)', flexShrink: 0 }}>✓</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: join form */}
        <div style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ maxWidth: 360 }}>
            <div className="wa-heading" style={{ marginBottom: '1.5rem' }}>Join the session</div>

            {/* Name */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="wa-question-label" style={{ display: 'block', marginBottom: 6 }}>Your name</label>
              <input
                className={`wa-input${nameError ? ' wa-input--error' : ''}`}
                value={name}
                onChange={e => { setName(e.target.value); setNameError(''); }}
                placeholder="Sargis"
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                autoFocus
              />
              {nameError && <div style={{ color: 'var(--rust)', fontSize: '0.8rem', marginTop: 4 }}>{nameError}</div>}
            </div>

            {/* Role */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="wa-question-label" style={{ marginBottom: 6 }}>Your role</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ROLES.map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`wa-qstrip-option${role === r ? ' wa-qstrip-option--selected' : ''}`}
                    onClick={() => setRole(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="wa-btn wa-btn--primary"
              style={{ width: '100%' }}
              onClick={handleJoin}
              disabled={loading}
            >
              {loading ? 'Joining…' : 'Join session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify join flow**

1. Navigate to `http://localhost:3070/session/TEST123` — should redirect to `/join`
2. Navigate directly to `/session/TEST123/join` — should show join form
3. Enter name + role, click Join → should navigate to `/session/TEST123/board`

- [ ] **Step 4: Commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add app/session
git commit -m "feat: add smart session router and engineer join screen"
```

---

## Task 7: Facilitator Lobby

**Files:**
- Create: `app/session/[id]/lobby/page.tsx`

Spec: `spec/04-facilitator-flow/lobby.md`, `spec/04-facilitator-flow/create-session.md`

- [ ] **Step 1: Create app/session/[id]/lobby/page.tsx**

```tsx
'use client';

// Facilitator lobby — spec: 04-facilitator-flow/lobby.md
// Share URL (without /join), live settings PATCH, start session

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { PROMPT_CATEGORIES } from '@/lib/categories';
import { getSocket } from '@/lib/socket';
import { Session, Participant, StatusBadge, Toggle } from '@/app/components/Primitives';

const WINDOW_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: 'Untimed', value: 0 },
];

export default function FacilitatorLobby() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? localStorage.getItem(`wa-facilitator-token-${id}`) ?? '';

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [windowMin, setWindowMin] = useState(10);
  const [liveTeamFeed, setLiveTeamFeed] = useState(true);
  const [enabledCategories, setEnabledCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Share URL = session URL without /join
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/session/${id}`
    : `/session/${id}`;

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) { setError('Session not found'); return; }
    const s: Session = await res.json();
    setSession(s);
    setParticipants(s.participants);
    setWindowMin(s.submissionWindowMin);
    setLiveTeamFeed(s.liveTeamFeed);
    setEnabledCategories(s.enabledCategories);
  }, [id]);

  useEffect(() => {
    loadSession();
    // Real-time participant updates
    const socket = getSocket();
    socket.connect();
    socket.emit('join-session', { sessionId: id, token });
    socket.on('participant:joined', (p: Participant) => {
      setParticipants(prev => [...prev.filter(x => x.id !== p.id), p]);
    });
    socket.on('participant:left', ({ id: pid }: { id: string }) => {
      setParticipants(prev => prev.filter(p => p.id !== pid));
    });
    socket.on('session:status', ({ status }: { status: string }) => {
      if (status === 'active') {
        router.push(`/session/${id}/facilitator?token=${token}`);
      }
    });
    return () => { socket.off('participant:joined'); socket.off('participant:left'); socket.off('session:status'); };
  }, [id, token, loadSession, router]);

  async function patchSettings(updates: Record<string, unknown>) {
    const res = await fetch(`/api/sessions/${id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-facilitator-token': token },
      body: JSON.stringify(updates),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to update'); }
  }

  function handleWindowChange(v: number) {
    setWindowMin(v);
    patchSettings({ submissionWindowMin: v });
  }

  function handleFeedChange(v: boolean) {
    setLiveTeamFeed(v);
    patchSettings({ liveTeamFeed: v });
  }

  function handleCategoryToggle(catId: string) {
    const next = enabledCategories.includes(catId)
      ? enabledCategories.filter(c => c !== catId)
      : [...enabledCategories, catId];
    if (next.length === 0) return; // min 1
    setEnabledCategories(next);
    patchSettings({ enabledCategories: next });
  }

  async function handleStart() {
    setLoading(true);
    setError('');
    try {
      const socket = getSocket();
      socket.emit('session:start', { sessionId: id, token });
      // REST fallback
      const res = await fetch(`/api/sessions/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-facilitator-token': token },
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to start'); }
      else router.push(`/session/${id}/facilitator?token=${token}`);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <div className="wa-screen">
        <div className="wa-topbar"><span className="wa-eyebrow">Work Audit</span></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span style={{ color: 'var(--muted)' }}>Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wa-screen">
      <div className="wa-topbar">
        <span className="wa-eyebrow">Work Audit</span>
        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{session.name}</span>
        <StatusBadge status="lobby" />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{participants.length} joined</span>
          <button className="wa-btn wa-btn--primary" onClick={handleStart} disabled={loading}>
            {loading ? 'Starting…' : 'Start session'}
          </button>
        </div>
      </div>

      <div className="wa-main wa-2col">
        {/* Left: participants */}
        <div style={{ padding: '1.5rem', borderRight: '1px solid var(--border)', overflow: 'auto' }}>
          <div className="wa-eyebrow" style={{ marginBottom: '0.75rem' }}>Share link</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
            <code style={{ flex: 1, padding: '0.5rem', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {shareUrl}
            </code>
            <button
              className="wa-btn wa-btn--secondary"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            >
              Copy
            </button>
          </div>

          <div className="wa-eyebrow" style={{ marginBottom: '0.75rem' }}>
            Participants ({participants.length})
          </div>
          {participants.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Waiting for engineers to join…</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {participants.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="wa-avatar" style={{ background: p.color }}>{p.initials}</div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{p.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: settings */}
        <div style={{ padding: '1.5rem', overflow: 'auto' }}>
          <div className="wa-eyebrow" style={{ marginBottom: '0.75rem' }}>Session settings</div>
          {error && <div style={{ color: 'var(--rust)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}

          {/* Submission window */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="wa-question-label" style={{ marginBottom: 6 }}>Submission window</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {WINDOW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`wa-qstrip-option${windowMin === opt.value ? ' wa-qstrip-option--selected' : ''}`}
                  onClick={() => handleWindowChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live team feed */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Live team feed</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Engineers see each other&apos;s activities</div>
            </div>
            <Toggle on={liveTeamFeed} onChange={handleFeedChange} />
          </div>

          {/* Categories */}
          <div>
            <div className="wa-question-label" style={{ marginBottom: 6 }}>Activity categories</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PROMPT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`wa-tag${enabledCategories.includes(cat.id) ? ' wa-tag--selected' : ''}`}
                  onClick={() => handleCategoryToggle(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {enabledCategories.length === 0 && (
              <div style={{ color: 'var(--rust)', fontSize: '0.8rem', marginTop: 4 }}>At least one category must be enabled</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test lobby**

1. Create a session from `/`
2. Verify redirect lands on `/session/{id}/lobby?token=...`
3. Confirm share URL displayed, participant list empty initially
4. Open the share URL in another tab, join as an engineer, verify participant appears in facilitator lobby in real-time

- [ ] **Step 3: Commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add app/session/
git commit -m "feat: implement facilitator lobby with live participants and settings"
```

---

## Task 8: Engineer Board

**Files:**
- Create: `app/session/[id]/board/page.tsx`

Spec: `spec/03-engineer-flow/board-lobby.md`, `spec/03-engineer-flow/board-active.md`, `spec/03-engineer-flow/board-discussion.md`, `spec/03-engineer-flow/add-activity-form.md`, `spec/03-engineer-flow/prompt-rail.md`, `spec/03-engineer-flow/team-feed.md`, `spec/03-engineer-flow/suggestions.md`

This is the most complex engineer-facing file. Read the spec files carefully before writing.

Key requirements:
- Three states: lobby (waiting), active (3-column: 220px prompt rail | center | 296px sidebar), discussion (read-only + flagged sidebar)
- Topbar: timer (≤120s → rust + pulse), "{N} activities" count (active) OR session-wide "{classified}/{total} classified" (discussion)
- Add activity form: title + 3 QuestionBlocks (tpo default `30m-2h`, freq default `weekly`, energy default `fine`); Save / Save & add another / Esc cancel
- Prompt rail: 9 categories, first 3 expanded, filtered by `enabledCategories`; examples pre-fill title+tpo+freq (not energy)
- Soft delete: 5s undo toast; own activities only; active phase only
- Team feed: max 8, newest first, exclude self, hidden when `liveTeamFeed` false
- Suggestions: 30-char prefix dedup, exclude if engineer has 20-char match, max 4, sort by count
- Discussion: own read-only cards + flagged sidebar (from anyone)

- [ ] **Step 1: Create app/session/[id]/board/page.tsx**

This is a large file (~600+ lines). Write it completely:

```tsx
'use client';

// Engineer board — spec: 03-engineer-flow/board-*.md
// States: lobby | active | discussion

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { PROMPT_CATEGORIES } from '@/lib/categories';
import {
  Session, Activity, Participant,
  TimePerOccurrence, Frequency, Energy,
  TPO_LABELS, FREQ_LABELS, ENERGY_LABELS, VERDICT_LABELS,
  ActivityChipsShort, VerdictChip, TimerDisplay, StatusBadge,
  calcEffort, effortDisplay, titleSimilarity,
} from '@/app/components/Primitives';

// ── Add Activity Form ──────────────────────────────────────────────────────

type AddFormProps = {
  onSave: (title: string, tpo: TimePerOccurrence, freq: Frequency, energy: Energy) => void;
  onSaveAnother: (title: string, tpo: TimePerOccurrence, freq: Frequency, energy: Energy) => void;
  onCancel: () => void;
  initialTitle?: string;
  initialTpo?: TimePerOccurrence;
  initialFreq?: Frequency;
};

function AddActivityForm({ onSave, onSaveAnother, onCancel, initialTitle = '', initialTpo = '30m-2h', initialFreq = 'weekly' }: AddFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [tpo, setTpo] = useState<TimePerOccurrence>(initialTpo);
  const [freq, setFreq] = useState<Frequency>(initialFreq);
  const [energy, setEnergy] = useState<Energy>('fine');
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  function validate(): boolean {
    if (!title.trim()) { setError('Activity title is required'); return false; }
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    onSave(title.trim(), tpo, freq, energy);
  }

  function handleSaveAnother() {
    if (!validate()) return;
    onSaveAnother(title.trim(), tpo, freq, energy);
    setTitle(''); setTpo('30m-2h'); setFreq('weekly'); setEnergy('fine'); setError('');
    titleRef.current?.focus();
  }

  const tpoOpts: TimePerOccurrence[] = ['<30m', '30m-2h', 'half-day', 'day+'];
  const freqOpts: Frequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'];
  const energyOpts: Energy[] = ['energizing', 'fine', 'tedious', 'draining'];

  return (
    <div className="wa-card" style={{ marginBottom: '1rem' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <input
          ref={titleRef}
          className={`wa-input${error ? ' wa-input--error' : ''}`}
          placeholder="What recurring work do you do?"
          value={title}
          onChange={e => { setTitle(e.target.value); setError(''); }}
        />
        {error && <div style={{ color: 'var(--rust)', fontSize: '0.75rem', marginTop: 3 }}>{error}</div>}
      </div>

      <div className="wa-question-block">
        <div className="wa-question-label">How long per occurrence?</div>
        <div className="wa-qstrip">
          {tpoOpts.map(opt => (
            <button key={opt} type="button" className={`wa-qstrip-option${tpo === opt ? ' wa-qstrip-option--selected' : ''}`} onClick={() => setTpo(opt)}>
              {TPO_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div className="wa-question-block">
        <div className="wa-question-label">How often?</div>
        <div className="wa-qstrip">
          {freqOpts.map(opt => (
            <button key={opt} type="button" className={`wa-qstrip-option${freq === opt ? ' wa-qstrip-option--selected' : ''}`} onClick={() => setFreq(opt)}>
              {FREQ_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div className="wa-question-block">
        <div className="wa-question-label">How does it feel?</div>
        <div className="wa-qstrip">
          {energyOpts.map(opt => (
            <button key={opt} type="button" className={`wa-qstrip-option${energy === opt ? ' wa-qstrip-option--selected' : ''}`} onClick={() => setEnergy(opt)}>
              {ENERGY_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
        <button className="wa-btn wa-btn--primary" type="button" onClick={handleSave}>Save</button>
        <button className="wa-btn wa-btn--secondary" type="button" onClick={handleSaveAnother}>Save &amp; add another</button>
        <button className="wa-btn wa-btn--ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Prompt Rail ────────────────────────────────────────────────────────────

function PromptRail({
  enabledCategories,
  onSelectExample,
}: {
  enabledCategories: string[];
  onSelectExample: (title: string, tpo: TimePerOccurrence, freq: Frequency) => void;
}) {
  const visible = PROMPT_CATEGORIES.filter(c => enabledCategories.includes(c.id));
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(visible.slice(0, 3).map(c => c.id))
  );

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="wa-prompt-rail">
      <div className="wa-eyebrow" style={{ marginBottom: '0.5rem', padding: '0 0.25rem' }}>Prompts</div>
      {visible.map(cat => (
        <div key={cat.id} className="wa-prompt-category">
          <div className="wa-prompt-category-header" onClick={() => toggle(cat.id)}>
            <span>{cat.label}</span>
            <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{expanded.has(cat.id) ? '▲' : '▼'}</span>
          </div>
          {expanded.has(cat.id) && cat.examples.map((ex, i) => (
            <span
              key={i}
              className="wa-prompt-example"
              onClick={() => onSelectExample(ex.title, ex.tpo as TimePerOccurrence, ex.freq as Frequency)}
            >
              {ex.title}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Undo Toast ─────────────────────────────────────────────────────────────

type PendingDelete = { id: string; title: string; timeoutId: ReturnType<typeof setTimeout> };

// ── Main Board ─────────────────────────────────────────────────────────────

export default function EngineerBoard() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myName, setMyName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [prefill, setPrefill] = useState<{ title: string; tpo: TimePerOccurrence; freq: Frequency } | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState('');

  const socketRef = useRef(getSocket());

  const myActivities = activities.filter(a => a.participantName === myName);
  const teamFeed = activities
    .filter(a => a.participantName !== myName)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  // Suggestions — spec: 03-engineer-flow/suggestions.md
  // group by 30-char prefix; exclude if engineer has 20-char match; max 4; sort by count
  const suggestions = (() => {
    if (!session?.liveTeamFeed) return [];
    const grouped = new Map<string, { title: string; count: number }>();
    activities
      .filter(a => a.participantName !== myName)
      .forEach(a => {
        const key = a.title.trim().toLowerCase().slice(0, 30);
        const existing = grouped.get(key);
        if (existing) existing.count++;
        else grouped.set(key, { title: a.title, count: 1 });
      });
    return [...grouped.values()]
      .filter(s => !myActivities.some(a => a.title.trim().toLowerCase().slice(0, 20) === s.title.trim().toLowerCase().slice(0, 20)))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  })();

  // Discussion stats
  const classified = activities.filter(a => a.teamAuto !== 'unclassified').length;
  const total = activities.length;
  const flagged = activities.filter(a => a.flagged);

  const loadSession = useCallback(async () => {
    const name = localStorage.getItem(`wa-eng-name-${id}`);
    const role = localStorage.getItem(`wa-eng-role-${id}`) || 'IC';
    if (!name) { router.replace(`/session/${id}/join`); return; }
    setMyName(name);

    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) { setError('Session not found'); return; }
    const s: Session = await res.json();
    setSession(s);
    setActivities(s.activities);
    setParticipants(s.participants);

    // Timer
    if (s.status === 'active' && s.submissionWindowMin > 0 && s.startedAt) {
      const elapsed = (Date.now() - new Date(s.startedAt).getTime()) / 1000;
      const total = s.submissionWindowMin * 60;
      const rem = Math.max(0, Math.floor(total - elapsed));
      setRemainingSeconds(rem);
    }

    // Connect socket
    const socket = socketRef.current;
    socket.connect();
    socket.emit('join-session', { sessionId: id, name, role });
  }, [id, router]);

  useEffect(() => {
    loadSession();
    const socket = socketRef.current;

    socket.on('session:state', (s: Session) => {
      setSession(s);
      setActivities(s.activities);
      setParticipants(s.participants);
    });

    socket.on('activity:added', (act: Activity) => {
      setActivities(prev => [...prev.filter(a => a.id !== act.id), act]);
    });

    socket.on('activity:updated', (act: Activity) => {
      setActivities(prev => prev.map(a => a.id === act.id ? act : a));
    });

    socket.on('activity:deleted', ({ id: actId }: { id: string }) => {
      setActivities(prev => prev.filter(a => a.id !== actId));
    });

    socket.on('activity:merged', ({ merged, updatedSources }: { merged: Activity; updatedSources: Activity[] }) => {
      setActivities(prev => {
        const without = prev.filter(a => !updatedSources.some(s => s.id === a.id));
        return [...without, ...updatedSources, merged];
      });
    });

    socket.on('participant:joined', (p: Participant) => {
      setParticipants(prev => [...prev.filter(x => x.id !== p.id), p]);
    });

    socket.on('participant:left', ({ id: pid }: { id: string }) => {
      setParticipants(prev => prev.filter(p => p.id !== pid));
    });

    socket.on('session:status', ({ status, startedAt }: { status: string; startedAt?: string }) => {
      setSession(prev => prev ? { ...prev, status: status as Session['status'], startedAt } : prev);
      if (status === 'active' && startedAt) {
        const s = session;
        if (s && s.submissionWindowMin > 0) {
          setRemainingSeconds(s.submissionWindowMin * 60);
        }
      }
    });

    socket.on('session:extended', ({ remainingSeconds: rem }: { remainingSeconds: number }) => {
      setRemainingSeconds(rem);
    });

    socket.on('session:settings', (settings: Partial<Session>) => {
      setSession(prev => prev ? { ...prev, ...settings } : prev);
    });

    socket.on('error', ({ message }: { message: string }) => setError(message));

    return () => {
      socket.off('session:state');
      socket.off('activity:added');
      socket.off('activity:updated');
      socket.off('activity:deleted');
      socket.off('activity:merged');
      socket.off('participant:joined');
      socket.off('participant:left');
      socket.off('session:status');
      socket.off('session:extended');
      socket.off('session:settings');
      socket.off('error');
    };
  }, [id, loadSession, session]);

  // 1-second timer tick
  useEffect(() => {
    if (!session || session.status !== 'active' || session.submissionWindowMin === 0) return;
    const tick = setInterval(() => {
      setRemainingSeconds(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [session?.status, session?.submissionWindowMin]);

  function addActivity(title: string, tpo: TimePerOccurrence, freq: Frequency, energy: Energy) {
    socketRef.current.emit('activity:add', { sessionId: id, title, tpo, freq, energy });
    setShowAddForm(false);
    setPrefill(null);
  }

  function addActivityAnother(title: string, tpo: TimePerOccurrence, freq: Frequency, energy: Energy) {
    socketRef.current.emit('activity:add', { sessionId: id, title, tpo, freq, energy });
    // form stays open with cleared fields
  }

  function softDelete(act: Activity) {
    // 5s undo — spec: 10-business-rules/soft-delete.md
    // New delete commits prior pending immediately
    setPendingDeletes(prev => {
      prev.forEach(p => { if (p.id !== act.id) { clearTimeout(p.timeoutId); socketRef.current.emit('activity:delete', { sessionId: id, activityId: p.id }); } });
      const timeoutId = setTimeout(() => {
        socketRef.current.emit('activity:delete', { sessionId: id, activityId: act.id });
        setPendingDeletes(prev => prev.filter(p => p.id !== act.id));
      }, 5000);
      return [...prev.filter(p => p.id === act.id ? (clearTimeout(p.timeoutId), false) : true), { id: act.id, title: act.title, timeoutId }];
    });
  }

  function undoDelete(actId: string) {
    setPendingDeletes(prev => {
      const p = prev.find(x => x.id === actId);
      if (p) clearTimeout(p.timeoutId);
      return prev.filter(x => x.id !== actId);
    });
  }

  function handlePromptSelect(title: string, tpo: TimePerOccurrence, freq: Frequency) {
    setPrefill({ title, tpo, freq });
    setShowAddForm(true);
  }

  if (!session) {
    return (
      <div className="wa-screen">
        <div className="wa-topbar"><span className="wa-eyebrow">Work Audit</span></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {error
            ? <div style={{ textAlign: 'center', color: 'var(--rust)' }}>{error}</div>
            : <span style={{ color: 'var(--muted)' }}>Loading…</span>}
        </div>
      </div>
    );
  }

  const isPendingDelete = (id: string) => pendingDeletes.some(p => p.id === id);

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (session.status === 'lobby') {
    return (
      <div className="wa-screen">
        <div className="wa-topbar">
          <span className="wa-eyebrow">Work Audit</span>
          <span style={{ fontWeight: 500 }}>{session.name}</span>
          <StatusBadge status="lobby" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
          <div className="wa-display">Waiting for the session to start</div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>The facilitator will start the session shortly.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {participants.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.75rem', background: 'var(--cream)', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div className="wa-avatar" style={{ background: p.color, width: 24, height: 24, fontSize: 9 }}>{p.initials}</div>
                <span style={{ fontSize: '0.8rem' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── DISCUSSION ────────────────────────────────────────────────────────────
  if (session.status === 'discussion' || session.status === 'done') {
    const ownActivities = activities.filter(a => a.participantName === myName);
    const progressPct = total > 0 ? Math.round((classified / total) * 100) : 0;

    return (
      <div className="wa-screen">
        <div className="wa-topbar">
          <span className="wa-eyebrow">Work Audit</span>
          <span style={{ fontWeight: 500 }}>{session.name}</span>
          <StatusBadge status={session.status} />
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
            {classified}/{total} classified
          </span>
        </div>
        <div className="wa-main" style={{ display: 'grid', gridTemplateColumns: '1fr 296px', overflow: 'hidden' }}>
          {/* Own activities */}
          <div className="wa-col-scroll">
            <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Your activities</div>
            {ownActivities.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>You have no activities in this session.</div>
            )}
            {ownActivities.map(act => (
              <div key={act.id} className={`wa-activity${act.flagged ? ' wa-activity--flagged' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem', flex: 1 }}>{act.title}</div>
                  <VerdictChip verdict={act.teamAuto} />
                </div>
                <ActivityChipsShort activity={act} />
                {act.discussionNote && (
                  <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    {act.discussionNote}
                  </div>
                )}
                {act.flagged && <span className="wa-flag" style={{ marginTop: 4, display: 'block' }}>★ Priority</span>}
              </div>
            ))}
          </div>

          {/* Sidebar: flagged + progress */}
          <div className="wa-sidebar">
            <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Flagged priorities</div>
            <div className="wa-progress" style={{ marginBottom: 8 }}>
              <div className="wa-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              {total - classified} activities still to review
            </div>
            {flagged.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>No priorities flagged yet</div>
            )}
            {flagged.map(act => (
              <div key={act.id} className="wa-activity wa-activity--flagged">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                  <div className="wa-avatar" style={{ background: act.participantColor, width: 20, height: 20, fontSize: 8 }}>{act.participantInitials}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{act.participantName}</span>
                </div>
                <div style={{ fontWeight: 500, fontSize: '0.8rem', marginBottom: 4 }}>{act.title}</div>
                <VerdictChip verdict={act.teamAuto} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE ────────────────────────────────────────────────────────────────
  const hasTimer = session.submissionWindowMin > 0;
  const activityCount = activities.filter(a => a.participantName === myName).length;
  const showDoneBanner = activityCount >= 1 && !showAddForm;

  return (
    <div className="wa-screen">
      {/* Topbar */}
      <div className="wa-topbar">
        <span className="wa-eyebrow">Work Audit</span>
        <span style={{ fontWeight: 500 }}>{session.name}</span>
        <StatusBadge status="active" />
        {hasTimer && <TimerDisplay remainingSeconds={remainingSeconds} />}
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{activityCount} {activityCount === 1 ? 'activity' : 'activities'}</span>
        <button
          className="wa-btn wa-btn--secondary"
          style={{ marginLeft: 'auto' }}
          onClick={() => { setShowAddForm(true); setPrefill(null); }}
          disabled={showAddForm}
        >
          + Add activity
        </button>
      </div>

      {/* 3-column layout */}
      <div className="wa-main wa-3col-eng">
        {/* Prompt rail */}
        <PromptRail
          enabledCategories={session.enabledCategories}
          onSelectExample={handlePromptSelect}
        />

        {/* Center: add form + own activities */}
        <div className="wa-col-scroll">
          {showAddForm && (
            <AddActivityForm
              onSave={addActivity}
              onSaveAnother={addActivityAnother}
              onCancel={() => { setShowAddForm(false); setPrefill(null); }}
              initialTitle={prefill?.title}
              initialTpo={prefill?.tpo}
              initialFreq={prefill?.freq}
            />
          )}

          {showDoneBanner && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--cream)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--sage)', fontWeight: 500 }}>
                Great work! Add anything else you want the team to review.
              </span>
              <button className="wa-btn wa-btn--secondary" onClick={() => setShowAddForm(true)}>+ Add more</button>
            </div>
          )}

          {myActivities.filter(a => !isPendingDelete(a.id)).map(act => (
            <div key={act.id} className="wa-activity">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontWeight: 500, fontSize: '0.875rem', flex: 1 }}>{act.title}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="wa-btn wa-btn--ghost"
                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                    onClick={() => softDelete(act)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <ActivityChipsShort activity={act} />
            </div>
          ))}

          {myActivities.length === 0 && !showAddForm && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
              <div style={{ marginBottom: 12, fontSize: '0.9rem' }}>What recurring work do you do?</div>
              <button className="wa-btn wa-btn--primary" onClick={() => setShowAddForm(true)}>Add your first activity</button>
            </div>
          )}
        </div>

        {/* Right sidebar: suggestions + team feed */}
        <div className="wa-sidebar">
          {/* Suggestions */}
          {session.liveTeamFeed && suggestions.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Common activities</div>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="wa-btn wa-btn--ghost"
                  style={{ width: '100%', textAlign: 'left', marginBottom: 4, padding: '0.35rem 0.5rem', justifyContent: 'flex-start' }}
                  onClick={() => { setPrefill({ title: s.title, tpo: '30m-2h', freq: 'weekly' }); setShowAddForm(true); }}
                >
                  {s.title}
                  {s.count > 1 && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--muted)' }}>×{s.count}</span>}
                </button>
              ))}
              <div className="wa-sep" />
            </div>
          )}

          {/* Team feed */}
          {session.liveTeamFeed && (
            <>
              <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Team feed</div>
              {teamFeed.length === 0 && (
                <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>No team activity yet</div>
              )}
              {teamFeed.map(act => (
                <div key={act.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                    <div className="wa-avatar" style={{ background: act.participantColor, width: 20, height: 20, fontSize: 8 }}>{act.participantInitials}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{act.participantName} · just now</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', paddingLeft: 26 }}>{act.title}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Undo toasts */}
      {pendingDeletes.map(pd => (
        <div key={pd.id} className="wa-undo-toast">
          <span>Deleted &ldquo;{pd.title.slice(0, 40)}{pd.title.length > 40 ? '…' : ''}&rdquo;</span>
          <button onClick={() => undoDelete(pd.id)}>Undo</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: End-to-end test the engineer flow**

1. Create session from `/`
2. Open share URL in another tab → Join as engineer
3. Add an activity → verify it appears in real-time on facilitator lobby
4. Delete activity → verify 5s undo toast appears
5. Undo → verify activity restored
6. Start session from facilitator lobby → verify engineer board transitions to active state

- [ ] **Step 3: Commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add app/session/
git commit -m "feat: implement engineer board with lobby/active/discussion states"
```

---

## Task 9: Facilitator Hub — Live + Matrix + Grouped + Discuss Views

**Files:**
- Create: `app/session/[id]/facilitator/page.tsx`

Spec: `spec/04-facilitator-flow/live-view.md`, `spec/04-facilitator-flow/matrix-view.md`, `spec/04-facilitator-flow/grouped-view.md`, `spec/04-facilitator-flow/discuss-view.md`, `spec/04-facilitator-flow/edit-modal.md`, `spec/04-facilitator-flow/merge-modal.md`, `spec/04-facilitator-flow/export-modal.md`

Key requirements:
- 4 tabs: Live / Matrix / Grouped / Discuss (auto-switch to Discuss when session transitions to discussion)
- Live: per-person counts | live stream (10 cards, newest first, exclude merged sources) | themes + freq chart
- Matrix: scatter plot with quadrant tints; 320px sidebar; classify/flag/edit/merge
- Grouped: yes/maybe/no columns + unclassified below; sort by effort
- Discuss: mini matrix; pending tray; right rail classify (1/2/3 keys) + flag (f) + skip (s); similar activities (Jaccard >0.2, max 3); keyboard shortcuts
- Edit modal (760px): all fields + teamAuto + note + remove
- Merge modal (900px): similarity scoring; merged card editable
- Export modal (860px): preview from GET .../export; copy/download; MCP note always shown
- Topbar: activity counts exclude `isMergedSource`; timer + extend + snap-forward
- Facilitator actions on each card: edit/flag/classify

- [ ] **Step 1: Create app/session/[id]/facilitator/page.tsx**

This file is large (~800+ lines). Write it completely — no placeholders:

```tsx
'use client';

// Facilitator hub — spec: 04-facilitator-flow/
// Tabs: Live | Matrix | Grouped | Discuss + Edit/Merge/Export modals

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import {
  Session, Activity, Participant,
  TimePerOccurrence, Frequency, Energy, AutoVerdict,
  TPO_LABELS, FREQ_LABELS, ENERGY_LABELS, VERDICT_LABELS,
  ActivityChipsShort, VerdictChip, TimerDisplay, StatusBadge, ClassifyBtn,
  calcEffort, calcPerceivedCost, effortDisplay, effortPillClass,
  matrixCoords, clusterMatrixPositions, titleSimilarity,
} from '@/app/components/Primitives';

type Tab = 'live' | 'matrix' | 'grouped' | 'discuss';

// ── Activity Card (facilitator) ────────────────────────────────────────────

function FacActivityCard({
  act, onEdit, onFlag, onClassify, compact = false,
}: {
  act: Activity;
  onEdit: (a: Activity) => void;
  onFlag: (a: Activity) => void;
  onClassify: (a: Activity, v: AutoVerdict) => void;
  compact?: boolean;
}) {
  return (
    <div className={`wa-activity${act.flagged ? ' wa-activity--flagged' : ''}`} style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
        <div className="wa-avatar" style={{ background: act.participantColor }}>{act.participantInitials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.3 }}>{act.title}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{act.participantName}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            className="wa-btn wa-btn--ghost"
            style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: act.flagged ? 'var(--flag)' : undefined }}
            title={act.flagged ? 'Unflag' : 'Flag priority'}
            onClick={() => onFlag(act)}
          >
            ★
          </button>
          <button className="wa-btn wa-btn--ghost" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => onEdit(act)}>
            Edit
          </button>
        </div>
      </div>
      {!compact && <ActivityChipsShort activity={act} />}
      {!compact && (
        <div style={{ marginTop: 8 }}>
          <ClassifyBtn current={act.teamAuto} onClassify={(v) => onClassify(act, v)} />
        </div>
      )}
      {act.discussionNote && (
        <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic' }}>{act.discussionNote}</div>
      )}
      {act.mergedFromIds && act.mergedFromIds.length > 0 && (
        <div style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--muted)' }}>
          Merged from {act.mergedFromNames?.join(', ')}
        </div>
      )}
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────

function EditModal({
  act, sessionId, token, onClose, onSave, onRemove,
}: {
  act: Activity;
  sessionId: string;
  token: string;
  onClose: () => void;
  onSave: (updated: Partial<Activity>) => void;
  onRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState(act.title);
  const [tpo, setTpo] = useState<TimePerOccurrence>(act.tpo);
  const [freq, setFreq] = useState<Frequency>(act.freq);
  const [energy, setEnergy] = useState<Energy>(act.energy);
  const [teamAuto, setTeamAuto] = useState<AutoVerdict>(act.teamAuto);
  const [note, setNote] = useState(act.discussionNote);
  const socket = getSocket();

  function handleSave() {
    socket.emit('activity:update', { sessionId, activityId: act.id, title, tpo, freq, energy });
    socket.emit('activity:classify', { sessionId, token, activityId: act.id, teamAuto });
    socket.emit('activity:note', { sessionId, token, activityId: act.id, note });
    onSave({ title, tpo, freq, energy, teamAuto, discussionNote: note });
    onClose();
  }

  function handleRemove() {
    if (!confirm(`Delete "${act.title}"? This cannot be undone.`)) return;
    socket.emit('activity:delete', { sessionId, activityId: act.id });
    onRemove(act.id);
    onClose();
  }

  const tpoOpts: TimePerOccurrence[] = ['<30m', '30m-2h', 'half-day', 'day+'];
  const freqOpts: Frequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'];
  const energyOpts: Energy[] = ['energizing', 'fine', 'tedious', 'draining'];
  const autoOpts: AutoVerdict[] = ['yes', 'maybe', 'no', 'unclassified'];

  return (
    <div className="wa-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wa-modal wa-modal--md">
        <div className="wa-modal-header">
          <span className="wa-heading">Edit activity</span>
          <button className="wa-btn wa-btn--ghost" onClick={onClose}>✕</button>
        </div>
        <div className="wa-modal-body">
          <div style={{ marginBottom: '1rem' }}>
            <div className="wa-question-label" style={{ marginBottom: 4 }}>Title</div>
            <input className="wa-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="wa-question-block">
            <div className="wa-question-label">Time per occurrence</div>
            <div className="wa-qstrip">{tpoOpts.map(o => (
              <button key={o} type="button" className={`wa-qstrip-option${tpo === o ? ' wa-qstrip-option--selected' : ''}`} onClick={() => setTpo(o)}>{TPO_LABELS[o]}</button>
            ))}</div>
          </div>

          <div className="wa-question-block">
            <div className="wa-question-label">Frequency</div>
            <div className="wa-qstrip">{freqOpts.map(o => (
              <button key={o} type="button" className={`wa-qstrip-option${freq === o ? ' wa-qstrip-option--selected' : ''}`} onClick={() => setFreq(o)}>{FREQ_LABELS[o]}</button>
            ))}</div>
          </div>

          <div className="wa-question-block">
            <div className="wa-question-label">Energy</div>
            <div className="wa-qstrip">{energyOpts.map(o => (
              <button key={o} type="button" className={`wa-qstrip-option${energy === o ? ' wa-qstrip-option--selected' : ''}`} onClick={() => setEnergy(o)}>{ENERGY_LABELS[o]}</button>
            ))}</div>
          </div>

          <div className="wa-question-block">
            <div className="wa-question-label">Team automatability</div>
            <div className="wa-qstrip">{autoOpts.map(o => (
              <button key={o} type="button" className={`wa-qstrip-option${teamAuto === o ? ' wa-qstrip-option--selected' : ''}`} onClick={() => setTeamAuto(o)}>{VERDICT_LABELS[o]}</button>
            ))}</div>
          </div>

          <div className="wa-question-block">
            <div className="wa-question-label">Discussion note</div>
            <textarea
              className="wa-input"
              style={{ height: 80, resize: 'vertical' }}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add context for the team…"
            />
          </div>
        </div>
        <div className="wa-modal-footer">
          <button className="wa-btn wa-btn--danger" style={{ marginRight: 'auto' }} onClick={handleRemove}>Remove activity</button>
          <button className="wa-btn wa-btn--secondary" onClick={onClose}>Cancel</button>
          <button className="wa-btn wa-btn--primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Merge Modal ────────────────────────────────────────────────────────────

function MergeModal({
  acts, sessionId, token, onClose, onMerge,
}: {
  acts: Activity[];
  sessionId: string;
  token: string;
  onClose: () => void;
  onMerge: (merged: Activity, sources: Activity[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergedTitle, setMergedTitle] = useState('');
  const [mergedTpo, setMergedTpo] = useState<TimePerOccurrence>('30m-2h');
  const [mergedFreq, setMergedFreq] = useState<Frequency>('weekly');
  const [mergedEnergy, setMergedEnergy] = useState<Energy>('fine');
  const socket = getSocket();

  // Sort by similarity to first selected
  const firstSelected = [...selected][0];
  const pivot = acts.find(a => a.id === firstSelected) ?? acts[0];

  function similarity(a: Activity): number {
    if (a.id === pivot.id) return 1;
    const sem = titleSimilarity(pivot.title, a.title);
    const sf = pivot.freq === a.freq ? 1 : 0;
    const st = pivot.tpo === a.tpo ? 1 : 0;
    return 0.85 * sem + 0.1 * sf + 0.05 * st;
  }

  const sorted = [...acts].sort((a, b) => similarity(b) - similarity(a));

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      // Auto-populate merged title from first selected
      if (next.size === 1) {
        const sel = acts.find(a => a.id === [...next][0]);
        if (sel) { setMergedTitle(sel.title); setMergedTpo(sel.tpo); setMergedFreq(sel.freq); setMergedEnergy(sel.energy); }
      }
      return next;
    });
  }

  function handleMerge() {
    if (selected.size < 2) return;
    socket.emit('activity:merge', {
      sessionId, token,
      sourceIds: [...selected],
      merged: { title: mergedTitle, tpo: mergedTpo, freq: mergedFreq, energy: mergedEnergy },
    });
    onClose();
  }

  const tpoOpts: TimePerOccurrence[] = ['<30m', '30m-2h', 'half-day', 'day+'];
  const freqOpts: Frequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'];
  const energyOpts: Energy[] = ['energizing', 'fine', 'tedious', 'draining'];

  return (
    <div className="wa-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wa-modal wa-modal--lg" style={{ maxHeight: '85vh' }}>
        <div className="wa-modal-header">
          <span className="wa-heading">Merge activities</span>
          <button className="wa-btn wa-btn--ghost" onClick={onClose}>✕</button>
        </div>
        <div className="wa-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Left: select sources */}
          <div>
            <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Select activities to merge ({selected.size} selected)</div>
            <div style={{ overflowY: 'auto', maxHeight: 400 }}>
              {sorted.filter(a => !a.isMergedSource).map(act => (
                <div
                  key={act.id}
                  className="wa-activity"
                  style={{ cursor: 'pointer', borderColor: selected.has(act.id) ? 'var(--slate)' : undefined, background: selected.has(act.id) ? '#e8f0f5' : undefined }}
                  onClick={() => toggleSelect(act.id)}
                >
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <input type="checkbox" checked={selected.has(act.id)} readOnly style={{ accentColor: 'var(--slate)' }} />
                    <div className="wa-avatar" style={{ background: act.participantColor, width: 20, height: 20, fontSize: 8 }}>{act.participantInitials}</div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{act.title}</span>
                  </div>
                  <div style={{ paddingLeft: 44 }}>
                    <ActivityChipsShort activity={act} />
                  </div>
                  <div style={{ paddingLeft: 44, fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>
                    Similarity: {Math.round(similarity(act) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: merged result */}
          <div>
            <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Merged result</div>
            <div style={{ marginBottom: '1rem' }}>
              <div className="wa-question-label" style={{ marginBottom: 4 }}>Title</div>
              <input className="wa-input" value={mergedTitle} onChange={e => setMergedTitle(e.target.value)} placeholder="Merged activity title" disabled={selected.size < 1} />
            </div>
            <div className="wa-question-block">
              <div className="wa-question-label">Time per occurrence</div>
              <div className="wa-qstrip">{tpoOpts.map(o => (
                <button key={o} type="button" className={`wa-qstrip-option${mergedTpo === o ? ' wa-qstrip-option--selected' : ''}`} onClick={() => setMergedTpo(o)}>{TPO_LABELS[o]}</button>
              ))}</div>
            </div>
            <div className="wa-question-block">
              <div className="wa-question-label">Frequency</div>
              <div className="wa-qstrip">{freqOpts.map(o => (
                <button key={o} type="button" className={`wa-qstrip-option${mergedFreq === o ? ' wa-qstrip-option--selected' : ''}`} onClick={() => setMergedFreq(o)}>{FREQ_LABELS[o]}</button>
              ))}</div>
            </div>
            <div className="wa-question-block">
              <div className="wa-question-label">Energy</div>
              <div className="wa-qstrip">{energyOpts.map(o => (
                <button key={o} type="button" className={`wa-qstrip-option${mergedEnergy === o ? ' wa-qstrip-option--selected' : ''}`} onClick={() => setMergedEnergy(o)}>{ENERGY_LABELS[o]}</button>
              ))}</div>
            </div>
          </div>
        </div>
        <div className="wa-modal-footer">
          <button className="wa-btn wa-btn--secondary" onClick={onClose}>Cancel</button>
          <button className="wa-btn wa-btn--primary" onClick={handleMerge} disabled={selected.size < 2}>
            Merge {selected.size > 0 ? `${selected.size} activities` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Export Modal ───────────────────────────────────────────────────────────

function ExportModal({ sessionId, sessionName, onClose }: { sessionId: string; sessionName: string; onClose: () => void }) {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/export`)
      .then(r => r.text())
      .then(md => { setMarkdown(md); setLoading(false); });
  }, [sessionId]);

  function handleCopy() {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const slug = sessionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${slug}-audit.md`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="wa-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wa-modal wa-modal--xl">
        <div className="wa-modal-header">
          <span className="wa-heading">Export session</span>
          <button className="wa-btn wa-btn--ghost" onClick={onClose}>✕</button>
        </div>
        <div className="wa-modal-body">
          <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
            <strong>MCP note:</strong> This session is also available to AI agents via the MCP server at <code>/mcp</code> using the <code>export_session_markdown</code> tool with session ID <code>{sessionId}</code>.
          </div>
          {loading
            ? <div style={{ color: 'var(--muted)' }}>Generating export…</div>
            : <pre style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflow: 'auto', background: 'white', padding: '1rem', border: '1px solid var(--border)', borderRadius: 4 }}>
                {markdown}
              </pre>
          }
        </div>
        <div className="wa-modal-footer">
          <button className="wa-btn wa-btn--secondary" onClick={handleCopy} disabled={loading}>
            {copied ? 'Copied!' : 'Copy markdown'}
          </button>
          <button className="wa-btn wa-btn--primary" onClick={handleDownload} disabled={loading}>
            Download .md
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Facilitator Hub ───────────────────────────────────────────────────

export default function FacilitatorHub() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? (typeof window !== 'undefined' ? localStorage.getItem(`wa-facilitator-token-${id}`) ?? '' : '');

  const [session, setSession] = useState<Session | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tab, setTab] = useState<Tab>('live');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [editAct, setEditAct] = useState<Activity | null>(null);
  const [showMerge, setShowMerge] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [discussIdx, setDiscussIdx] = useState(0);
  const [discussSkipped, setDiscussSkipped] = useState<Set<string>>(new Set());
  const [matrixSelected, setMatrixSelected] = useState<Activity | null>(null);
  const socketRef = useRef(getSocket());

  // Visible activities for facilitator (exclude merged sources per spec)
  const visibleActs = activities.filter(a => !a.isMergedSource);
  const classifiedCount = visibleActs.filter(a => a.teamAuto !== 'unclassified').length;
  const totalCount = visibleActs.length;

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) return;
    const s: Session = await res.json();
    setSession(s);
    setActivities(s.activities);
    setParticipants(s.participants);
    if (s.status === 'active' && s.submissionWindowMin > 0 && s.startedAt) {
      const elapsed = (Date.now() - new Date(s.startedAt).getTime()) / 1000;
      setRemainingSeconds(Math.max(0, Math.floor(s.submissionWindowMin * 60 - elapsed)));
    }
    if (s.status === 'discussion') setTab('discuss');
  }, [id]);

  useEffect(() => {
    loadSession();
    const socket = socketRef.current;
    socket.connect();
    socket.emit('join-session', { sessionId: id, token });

    socket.on('session:state', (s: Session) => {
      setSession(s); setActivities(s.activities); setParticipants(s.participants);
    });
    socket.on('activity:added', (act: Activity) => setActivities(prev => [...prev.filter(a => a.id !== act.id), act]));
    socket.on('activity:updated', (act: Activity) => setActivities(prev => prev.map(a => a.id === act.id ? act : a)));
    socket.on('activity:deleted', ({ id: actId }: { id: string }) => setActivities(prev => prev.filter(a => a.id !== actId)));
    socket.on('activity:merged', ({ merged, updatedSources }: { merged: Activity; updatedSources: Activity[] }) => {
      setActivities(prev => {
        const without = prev.filter(a => !updatedSources.find(s => s.id === a.id));
        return [...without, ...updatedSources, merged];
      });
    });
    socket.on('participant:joined', (p: Participant) => setParticipants(prev => [...prev.filter(x => x.id !== p.id), p]));
    socket.on('participant:left', ({ id: pid }: { id: string }) => setParticipants(prev => prev.filter(p => p.id !== pid)));
    socket.on('session:status', ({ status }: { status: string }) => {
      setSession(prev => prev ? { ...prev, status: status as Session['status'] } : prev);
      if (status === 'discussion') setTab('discuss');
    });
    socket.on('session:extended', ({ remainingSeconds: rem }: { remainingSeconds: number }) => setRemainingSeconds(rem));

    return () => {
      socket.off('session:state'); socket.off('activity:added'); socket.off('activity:updated');
      socket.off('activity:deleted'); socket.off('activity:merged'); socket.off('participant:joined');
      socket.off('participant:left'); socket.off('session:status'); socket.off('session:extended');
    };
  }, [id, token, loadSession]);

  // Timer tick
  useEffect(() => {
    if (!session || session.status !== 'active' || session.submissionWindowMin === 0) return;
    const tick = setInterval(() => setRemainingSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick);
  }, [session?.status, session?.submissionWindowMin]);

  // Discuss keyboard shortcuts — spec: 04-facilitator-flow/discuss-view.md
  useEffect(() => {
    if (tab !== 'discuss') return;
    const pending = visibleActs.filter(a => a.teamAuto === 'unclassified' && !discussSkipped.has(a.id));
    const current = pending[discussIdx] ?? null;

    function handleKey(e: KeyboardEvent) {
      if (!current || editAct) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') classifyActivity(current, 'yes');
      else if (e.key === '2') classifyActivity(current, 'maybe');
      else if (e.key === '3') classifyActivity(current, 'no');
      else if (e.key === 'f' || e.key === 'F') flagActivity(current);
      else if (e.key === 's' || e.key === 'S') {
        setDiscussSkipped(prev => new Set([...prev, current.id]));
        setDiscussIdx(i => i + 1);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [tab, discussIdx, visibleActs, discussSkipped, editAct]);

  function classifyActivity(act: Activity, verdict: AutoVerdict) {
    socketRef.current.emit('activity:classify', { sessionId: id, token, activityId: act.id, teamAuto: verdict });
    setDiscussIdx(i => i + 1);
  }

  function flagActivity(act: Activity) {
    socketRef.current.emit('activity:flag', { sessionId: id, token, activityId: act.id, flagged: !act.flagged });
  }

  function handleExtend(minutes: number) {
    socketRef.current.emit('session:extend', { sessionId: id, token, minutes });
  }

  function handleClose() {
    socketRef.current.emit('session:close', { sessionId: id, token });
  }

  function handleComplete() {
    socketRef.current.emit('session:complete', { sessionId: id, token });
  }

  if (!session) {
    return (
      <div className="wa-screen">
        <div className="wa-topbar"><span className="wa-eyebrow">Work Audit</span></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span style={{ color: 'var(--muted)' }}>Loading…</span>
        </div>
      </div>
    );
  }

  const canExport = session.status === 'discussion' || session.status === 'done';
  const hasTimer = session.status === 'active' && session.submissionWindowMin > 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="wa-screen">
      {/* Topbar */}
      <div className="wa-topbar">
        <span className="wa-eyebrow">Work Audit</span>
        <span style={{ fontWeight: 500 }}>{session.name}</span>
        <StatusBadge status={session.status} />
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{classifiedCount}/{totalCount} classified</span>
        {hasTimer && <TimerDisplay remainingSeconds={remainingSeconds} />}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {session.status === 'active' && (
            <>
              {[5, 10].map(m => (
                <button key={m} className="wa-btn wa-btn--secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }} onClick={() => handleExtend(m)}>+{m}m</button>
              ))}
              <button className="wa-btn wa-btn--secondary" onClick={handleClose}>End submissions</button>
            </>
          )}
          {session.status === 'discussion' && (
            <button className="wa-btn wa-btn--secondary" onClick={handleComplete}>Complete session</button>
          )}
          {canExport && (
            <button className="wa-btn wa-btn--primary" onClick={() => setShowExport(true)}>Export</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="wa-tabs">
        {(['live', 'matrix', 'grouped', 'discuss'] as Tab[]).map(t => (
          <div
            key={t}
            className={`wa-tab${tab === t ? ' wa-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="wa-main" style={{ overflow: 'hidden' }}>
        {tab === 'live' && <LiveTab activities={visibleActs} participants={participants} onEdit={setEditAct} onFlag={flagActivity} onClassify={classifyActivity} onMerge={() => setShowMerge(true)} />}
        {tab === 'matrix' && <MatrixTab activities={visibleActs} selected={matrixSelected} onSelect={setMatrixSelected} onEdit={setEditAct} onFlag={flagActivity} onClassify={classifyActivity} onMerge={() => setShowMerge(true)} />}
        {tab === 'grouped' && <GroupedTab activities={visibleActs} onEdit={setEditAct} onFlag={flagActivity} onClassify={classifyActivity} />}
        {tab === 'discuss' && <DiscussTab activities={visibleActs} sessionId={id} token={token} discussIdx={discussIdx} skipped={discussSkipped} onClassify={classifyActivity} onFlag={flagActivity} onEdit={setEditAct} onNext={() => setDiscussIdx(i => i + 1)} onPrev={() => setDiscussIdx(i => Math.max(0, i - 1))} />}
      </div>

      {/* Modals */}
      {editAct && (
        <EditModal
          act={editAct} sessionId={id} token={token}
          onClose={() => setEditAct(null)}
          onSave={updated => setActivities(prev => prev.map(a => a.id === editAct.id ? { ...a, ...updated } : a))}
          onRemove={actId => setActivities(prev => prev.filter(a => a.id !== actId))}
        />
      )}
      {showMerge && (
        <MergeModal
          acts={visibleActs} sessionId={id} token={token}
          onClose={() => setShowMerge(false)}
          onMerge={() => {}}
        />
      )}
      {showExport && (
        <ExportModal sessionId={id} sessionName={session.name} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}

// ── Live Tab ───────────────────────────────────────────────────────────────

function LiveTab({ activities, participants, onEdit, onFlag, onClassify, onMerge }: {
  activities: Activity[]; participants: Participant[];
  onEdit: (a: Activity) => void; onFlag: (a: Activity) => void;
  onClassify: (a: Activity, v: AutoVerdict) => void; onMerge: () => void;
}) {
  const recent = [...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
  const perPerson = participants.map(p => ({
    p, count: activities.filter(a => a.participantName === p.name).length,
  }));

  return (
    <div className="wa-3col-fac" style={{ width: '100%' }}>
      {/* Per-person counts */}
      <div className="wa-col" style={{ borderRight: '1px solid var(--border)', overflow: 'auto', padding: '1rem' }}>
        <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Per person</div>
        {perPerson.map(({ p, count }) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className="wa-avatar" style={{ background: p.color }}>{p.initials}</div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{p.name}</div>
              <div className="wa-mono" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{count} activit{count === 1 ? 'y' : 'ies'}</div>
            </div>
          </div>
        ))}
        <div className="wa-sep" />
        <button className="wa-btn wa-btn--secondary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={onMerge}>Merge activities…</button>
      </div>

      {/* Live stream */}
      <div className="wa-col-scroll">
        <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Live stream</div>
        {recent.map(act => (
          <FacActivityCard key={act.id} act={act} onEdit={onEdit} onFlag={onFlag} onClassify={onClassify} />
        ))}
        {recent.length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Waiting for activities…</div>}
      </div>

      {/* Themes + freq chart */}
      <div style={{ width: 280, padding: '1rem', borderLeft: '1px solid var(--border)', overflow: 'auto' }}>
        <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>By frequency</div>
        {(['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'] as Frequency[]).map(f => {
          const count = activities.filter(a => a.freq === f).length;
          const pct = activities.length > 0 ? (count / activities.length) * 100 : 0;
          return (
            <div key={f} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                <span>{FREQ_LABELS[f]}</span>
                <span className="wa-mono">{count}</span>
              </div>
              <div className="wa-progress">
                <div className="wa-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Matrix Tab ─────────────────────────────────────────────────────────────

function MatrixTab({ activities, selected, onSelect, onEdit, onFlag, onClassify, onMerge }: {
  activities: Activity[]; selected: Activity | null;
  onSelect: (a: Activity | null) => void;
  onEdit: (a: Activity) => void; onFlag: (a: Activity) => void;
  onClassify: (a: Activity, v: AutoVerdict) => void; onMerge: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const e = entries[0];
      setContainerSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const positions = clusterMatrixPositions(activities, containerSize.w, containerSize.h);

  const QUADRANT_LABELS = [
    { label: 'Automate', x: '75%', y: '15%' },
    { label: 'Simplify', x: '25%', y: '15%' },
    { label: 'Delegate', x: '75%', y: '85%' },
    { label: 'Accept', x: '25%', y: '85%' },
  ];

  return (
    <div style={{ display: 'flex', width: '100%', overflow: 'hidden' }}>
      {/* Matrix canvas */}
      <div style={{ flex: 1, padding: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>
          <span>← Less effort</span>
          <span>More effort →</span>
        </div>
        <div ref={containerRef} className="wa-matrix" style={{ flex: 1, position: 'relative' }}>
          {/* Quadrant tints */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '50%', background: 'var(--q-automate)', opacity: 0.4 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '50%', background: 'var(--q-simplify)', opacity: 0.4 }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '50%', height: '50%', background: 'var(--q-delegate)', opacity: 0.4 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '50%', height: '50%', background: 'var(--q-accept)', opacity: 0.4 }} />
          {/* Dividers */}
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--border)' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
          {/* Quadrant labels */}
          {QUADRANT_LABELS.map(q => (
            <div key={q.label} style={{ position: 'absolute', left: q.x, top: q.y, transform: 'translate(-50%, -50%)', fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, pointerEvents: 'none' }}>
              {q.label}
            </div>
          ))}
          {/* Dots */}
          {activities.map(act => {
            const pos = positions.get(act.id);
            if (!pos) return null;
            return (
              <div
                key={act.id}
                className={`wa-dot-activity${act.flagged ? ' wa-dot-activity--flagged' : ''}`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  background: act.participantColor,
                  outline: selected?.id === act.id ? '2px solid var(--ink)' : undefined,
                }}
                title={act.title}
                onClick={() => onSelect(selected?.id === act.id ? null : act)}
              >
                {act.participantInitials}
              </div>
            );
          })}
        </div>
        {/* Y axis label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4 }}>
          <span>← Energizing</span>
          <span>Draining →</span>
        </div>
      </div>

      {/* Sidebar */}
      <div className="wa-sidebar" style={{ width: 320, flexShrink: 0 }}>
        {selected ? (
          <>
            <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Selected</div>
            <FacActivityCard act={selected} onEdit={onEdit} onFlag={onFlag} onClassify={onClassify} />
            <div className="wa-sep" />
            <button className="wa-btn wa-btn--secondary" style={{ width: '100%', fontSize: '0.8rem', marginBottom: 8 }} onClick={() => { onMerge(); }}>Merge with…</button>
            <button className="wa-btn wa-btn--ghost" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => onSelect(null)}>Deselect</button>
          </>
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Click a dot to inspect an activity</div>
        )}
      </div>
    </div>
  );
}

// ── Grouped Tab ────────────────────────────────────────────────────────────

function GroupedTab({ activities, onEdit, onFlag, onClassify }: {
  activities: Activity[];
  onEdit: (a: Activity) => void; onFlag: (a: Activity) => void;
  onClassify: (a: Activity, v: AutoVerdict) => void;
}) {
  const byVerdict = (v: AutoVerdict) =>
    activities.filter(a => a.teamAuto === v).sort((a, b) => calcEffort(b) - calcEffort(a));

  return (
    <div style={{ display: 'flex', width: '100%', gap: 0, overflow: 'hidden' }}>
      {(['yes', 'maybe', 'no'] as AutoVerdict[]).map(v => (
        <div key={v} style={{ flex: 1, borderRight: '1px solid var(--border)', overflow: 'auto', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
            <VerdictChip verdict={v} />
            <span className="wa-mono" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{byVerdict(v).length}</span>
          </div>
          {byVerdict(v).map(act => (
            <FacActivityCard key={act.id} act={act} onEdit={onEdit} onFlag={onFlag} onClassify={onClassify} compact />
          ))}
          {byVerdict(v).length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>None yet</div>}
        </div>
      ))}
      {/* Unclassified below in scrollable area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
          <VerdictChip verdict="unclassified" />
          <span className="wa-mono" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{byVerdict('unclassified').length}</span>
        </div>
        {byVerdict('unclassified').map(act => (
          <FacActivityCard key={act.id} act={act} onEdit={onEdit} onFlag={onFlag} onClassify={onClassify} compact />
        ))}
        {byVerdict('unclassified').length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>All classified!</div>}
      </div>
    </div>
  );
}

// ── Discuss Tab ────────────────────────────────────────────────────────────

function DiscussTab({ activities, sessionId, token, discussIdx, skipped, onClassify, onFlag, onEdit, onNext, onPrev }: {
  activities: Activity[]; sessionId: string; token: string;
  discussIdx: number; skipped: Set<string>;
  onClassify: (a: Activity, v: AutoVerdict) => void;
  onFlag: (a: Activity) => void; onEdit: (a: Activity) => void;
  onNext: () => void; onPrev: () => void;
}) {
  const pending = activities.filter(a => a.teamAuto === 'unclassified' && !skipped.has(a.id));
  const current = pending[discussIdx % Math.max(1, pending.length)] ?? null;
  const classified = activities.filter(a => a.teamAuto !== 'unclassified');
  const flagged = activities.filter(a => a.flagged);

  // Similar activities — Jaccard >0.2, max 3
  const similar = current
    ? activities
        .filter(a => a.id !== current.id && titleSimilarity(a.title, current.title) > 0.2)
        .sort((a, b) => titleSimilarity(b.title, current.title) - titleSimilarity(a.title, current.title))
        .slice(0, 3)
    : [];

  return (
    <div style={{ display: 'flex', width: '100%', overflow: 'hidden' }}>
      {/* Left: pending tray */}
      <div style={{ width: 240, borderRight: '1px solid var(--border)', overflow: 'auto', padding: '0.75rem' }}>
        <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>To review ({pending.length})</div>
        {pending.map((act, i) => (
          <div
            key={act.id}
            style={{
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              marginBottom: 4,
              cursor: 'pointer',
              background: i === discussIdx % Math.max(1, pending.length) ? 'var(--cream)' : 'transparent',
              border: i === discussIdx % Math.max(1, pending.length) ? '1px solid var(--border)' : '1px solid transparent',
              fontSize: '0.8rem',
            }}
          >
            {act.title}
          </div>
        ))}
        {pending.length === 0 && <div style={{ color: 'var(--sage)', fontSize: '0.8rem', fontWeight: 500 }}>All reviewed! 🎉</div>}
      </div>

      {/* Center: current activity */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem' }}>
        {current ? (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <div className="wa-avatar" style={{ background: current.participantColor }}>{current.participantInitials}</div>
                <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{current.participantName}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>· {current.tpo} · {current.freq}</span>
              </div>
              <div className="wa-display" style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{current.title}</div>
              <ActivityChipsShort activity={current} />
            </div>

            {/* Classify */}
            <div style={{ marginBottom: '1rem' }}>
              <div className="wa-question-label" style={{ marginBottom: 6 }}>Can the team automate this? (1/2/3)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['yes', 'maybe', 'no'] as AutoVerdict[]).map((v, idx) => (
                  <button
                    key={v}
                    className={`wa-classify-btn wa-classify-btn--${v}${current.teamAuto === v ? ' active' : ''}`}
                    onClick={() => onClassify(current, v)}
                  >
                    {idx + 1}. {VERDICT_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>

            {/* Flag + Skip */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
              <button
                className={`wa-btn${current.flagged ? ' wa-btn--primary' : ' wa-btn--secondary'}`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => onFlag(current)}
              >
                {current.flagged ? '★ Flagged' : '☆ Flag priority (f)'}
              </button>
              <button className="wa-btn wa-btn--ghost" style={{ fontSize: '0.8rem' }} onClick={onNext}>Skip (s)</button>
              <button className="wa-btn wa-btn--ghost" style={{ fontSize: '0.8rem' }} onClick={() => onEdit(current)}>Edit</button>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="wa-btn wa-btn--secondary" style={{ fontSize: '0.8rem' }} onClick={onPrev} disabled={discussIdx === 0}>← Prev</button>
              <button className="wa-btn wa-btn--secondary" style={{ fontSize: '0.8rem' }} onClick={onNext}>Next →</button>
            </div>

            {/* Similar */}
            {similar.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Similar activities</div>
                {similar.map(act => (
                  <div key={act.id} className="wa-activity" style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>{act.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{act.participantName} · {Math.round(titleSimilarity(act.title, current.title) * 100)}% similar</div>
                    <VerdictChip verdict={act.teamAuto} />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--sage)' }}>
            <div className="wa-display" style={{ fontSize: '1.25rem', marginBottom: 8 }}>All activities reviewed</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{classified.length} classified · {flagged.length} flagged</div>
          </div>
        )}
      </div>

      {/* Right rail: classified + flagged */}
      <div className="wa-sidebar" style={{ width: 260 }}>
        <div className="wa-eyebrow" style={{ marginBottom: '0.5rem' }}>Keyboard shortcuts</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.8 }}>
          <div><code>1</code> Automate · <code>2</code> Maybe · <code>3</code> Keep human</div>
          <div><code>f</code> Flag priority · <code>s</code> Skip</div>
        </div>
        <div className="wa-sep" />
        <div className="wa-eyebrow" style={{ marginBottom: '0.5rem', marginTop: '0.75rem' }}>Classified ({classified.length})</div>
        {classified.slice(-5).reverse().map(act => (
          <div key={act.id} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: 2 }}>{act.title}</div>
            <VerdictChip verdict={act.teamAuto} />
          </div>
        ))}
        {flagged.length > 0 && (
          <>
            <div className="wa-sep" />
            <div className="wa-eyebrow" style={{ marginBottom: '0.5rem', marginTop: '0.75rem' }}>Flagged ({flagged.length})</div>
            {flagged.map(act => (
              <div key={act.id} className="wa-flag" style={{ fontSize: '0.75rem', marginBottom: 4 }}>★ {act.title}</div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test facilitator hub end-to-end**

1. Create session, start session (from lobby)
2. Add 5+ activities as an engineer
3. Switch to Matrix tab — verify dots appear at correct quadrant positions
4. Switch to Grouped tab — all should be in Unclassified
5. Switch to Discuss tab — classify first item with key `1` → should move to Classified list
6. Press `f` → verify flag; press `s` → skip to next
7. Click Edit on an activity → Edit modal should open
8. Click Merge → Merge modal opens
9. End submissions → session transitions to Discussion
10. Export button appears → click → Export modal shows markdown preview + MCP note

- [ ] **Step 3: Commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add app/session/
git commit -m "feat: implement facilitator hub with Live/Matrix/Grouped/Discuss tabs and modals"
```

---

## Task 10: AI Skills

**Files:**
- Create: `skills/summarize-session/SKILL.md`
- Create: `skills/find-best-opportunities/SKILL.md`
- Create: `skills/draft-backlog/SKILL.md`

Spec: `spec/08-ai-skills/summarize-session.md`, `spec/08-ai-skills/find-best-opportunities.md`, `spec/08-ai-skills/draft-backlog.md`

- [ ] **Step 1: Create skills/summarize-session/SKILL.md**

```markdown
---
name: summarize-session
description: Summarize a Work Audit session — get_session + list_activities, compute stats, produce one paragraph + table
---

# Summarize Session

Produce a concise summary of a Work Audit session for the facilitator.

## Steps

1. Call `get_session` with the session ID to retrieve session metadata and participant list.
2. Call `list_activities` with filter `all` to retrieve all activities.
3. Compute the following stats:
   - Total activities
   - Classified vs unclassified count
   - Flagged count
   - Breakdown by teamAuto verdict: yes / maybe / no / unclassified
   - Top 3 activities by perceived cost (hours × energy multiplier)
4. Write a **one-paragraph summary** covering: what the team does, the dominant energy levels, the effort distribution, and the top automation opportunities.
5. Write a **summary table** with columns: Activity | Owner | tpo | freq | energy | teamAuto | Flagged

## Notes

- This is a read-only skill — do NOT call any write APIs.
- Use perceived cost (h/wk × energy multiplier) to rank activities: energizing=0.5, fine=1.0, tedious=1.5, draining=2.0.
- Present results in plain markdown suitable for sharing with stakeholders.
```

- [ ] **Step 2: Create skills/find-best-opportunities/SKILL.md**

```markdown
---
name: find-best-opportunities
description: Score and rank the top 5 automation opportunities from a Work Audit session
---

# Find Best Automation Opportunities

Identify the top 5 activities most worth automating, ranked by a composite score.

## Score Formula

```
score = effort_h_per_wk × teamAuto_multiplier × energy_bonus
```

Where:
- `teamAuto_multiplier`: yes=2.0, maybe=1.0, no=0, unclassified=0.5
- `energy_bonus`: 1.5 if draining, 1.0 otherwise
- `effort_h_per_wk = tpo_hours × freq_multiplier`
  - tpo: <30m=0.5h, 30m-2h=1.25h, half-day=4h, day+=8h
  - freq: daily=5, weekly=1, monthly=0.23, quarterly=0.077, adhoc=0.3

## Steps

1. Call `list_activities` with filter `all`.
2. Compute score for each activity using the formula above.
3. Sort descending by score.
4. Present the top 5 as a ranked list with: rank, activity title, owner, score, teamAuto verdict, energy, effort.
5. **Human gate:** Do NOT flag activities in the session automatically. Present the list and ask the facilitator if they want to flag any of these as priorities.
6. If the facilitator confirms, call `activity:flag` (via the app UI or REST API) for the approved activities only.

## Notes

- Activities with teamAuto=no score 0 and should not appear in the top 5.
- This is an advisory skill — always get human confirmation before making changes.
```

- [ ] **Step 3: Create skills/draft-backlog/SKILL.md**

```markdown
---
name: draft-backlog
description: Draft backlog tickets from flagged Work Audit activities
---

# Draft Backlog

Turn flagged Work Audit activities into actionable backlog items.

## Steps

1. Call `list_activities` with filter `flagged` to retrieve all flagged activities.
2. For each flagged activity, draft a backlog item with:
   - **Title:** Action-oriented rewrite (e.g. "Automate weekly metrics report generation" not "Weekly metrics report")
   - **Description:** What it is, who reported it, current effort (h/wk), energy, teamAuto verdict
   - **T-shirt size:** based on effort h/wk: <1=XS, 1-3=S, 3-8=M, 8-20=L, >20=XL
   - **Labels:** `work-audit`, energy level, teamAuto verdict
3. Ask the facilitator which format they want:
   - Linear (copy-paste ready markdown)
   - Jira (summary + description fields)
   - GitHub Issues (markdown)
   - Plain markdown list
4. Format all items in the chosen format and present them.

## Notes

- Only use flagged activities — do not include unclassified or non-flagged items.
- Use the session name as the Epic/initiative label where applicable.
- Do NOT create tickets automatically — always present for review first.
```

- [ ] **Step 4: Commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add skills/
git commit -m "feat: add AI skills for summarize-session, find-best-opportunities, and draft-backlog"
```

---

## Task 11: Final Polish — Port, README, Verification

**Files:**
- Modify: `README.md`
- Verify: TypeScript compilation, server starts on 3070, full flow works

- [ ] **Step 1: Update README.md**

Replace with:

```markdown
# Work Audit — Experiment 07

Real-time collaborative work audit tool for engineering teams.

## Tech Stack

- Next.js 14 (App Router + custom Express server)
- Socket.io (real-time collaboration)
- MCP server (`/mcp`) — read-only tools for AI agents
- Tailwind CSS + `wa-*` design system
- In-memory store (no database)
- TypeScript

## Running

```bash
npm install
npm run dev
```

Opens on **http://localhost:3070**

## URLs

| URL | Description |
|-----|-------------|
| `/` | Create a new session (facilitator) |
| `/session/{id}` | Smart router (→ join or facilitator) |
| `/session/{id}/join` | Engineer join screen |
| `/session/{id}/board` | Engineer board (lobby/active/discussion) |
| `/session/{id}/lobby?token=...` | Facilitator lobby |
| `/session/{id}/facilitator?token=...` | Facilitator hub |
| `/api/sessions` | REST API |
| `/mcp` | MCP server (read-only) |

## AI Skills

See `skills/` for facilitator-facing AI prompt workflows:
- `summarize-session` — session summary
- `find-best-opportunities` — top automation candidates
- `draft-backlog` — draft tickets from flagged activities

## Session Flow

```
Facilitator: / → create → /lobby → start → /facilitator
Engineer:    /session/{id} → /join → /board (lobby → active → discussion)
```
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
npx tsc --noEmit 2>&1
```

Expected: Zero errors. Fix any remaining type errors before proceeding.

- [ ] **Step 3: Verify server starts on correct port**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
npm run dev &
sleep 5
curl -s http://localhost:3070/ | head -5
curl -s -X POST http://localhost:3070/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke test","enabledCategories":["meetings"]}' | jq .id
```

Expected: HTML response from Next.js on 3070; session created with 8-char ID.

- [ ] **Step 4: Full end-to-end smoke test**

1. Create session at `http://localhost:3070/`
2. Copy share URL, open in another tab → join as engineer
3. Session starts (facilitator lobby → Start)
4. Engineer adds 3 activities
5. Facilitator sees them in Live tab
6. Facilitator classifies in Discuss tab
7. End submissions → Discussion state
8. Export modal → markdown preview visible + MCP note shown
9. MCP: `curl -X POST http://localhost:3070/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_sessions","arguments":{}},"id":1}'`

- [ ] **Step 5: Final commit**

```bash
cd /home/sargis/Projects/spec-driven-dev-research/experiments/07-from-full-spec-sonet/output
git add README.md
git commit -m "feat: update README for Work Audit experiment 07"
```

---

## Spec Coverage Checklist

After implementation, verify each section is covered:

- [ ] `01-overview` — session lifecycle states (lobby→active→discussion→done), two roles
- [ ] `02-data-model` — all fields on Session/Participant/Activity, all enums, calculations
- [ ] `03-engineer-flow` — join screen, board states, add form, prompt rail, team feed, suggestions, soft delete
- [ ] `04-facilitator-flow` — create, lobby, live, matrix, grouped, discuss, edit/merge/export modals
- [ ] `05-real-time` — all client→server events, all server→client events
- [ ] `06-rest-api` — all session + activity endpoints with exact error strings
- [ ] `07-mcp-server` — 4 tools, read-only, `/mcp`
- [ ] `08-ai-skills` — 3 SKILL.md files
- [ ] `09-design-system` — CSS tokens, wa-* classes, fonts, layout patterns
- [ ] `10-business-rules` — permissions, timer (no auto-close), merge rules, suggestion rules, soft delete, reconnection
- [ ] `11-non-functional` — port 3070, mobile-friendly join + engineer board, in-memory only
- [ ] `IMPLEMENTATION-INDEX.md` — energy enum (fine not neutral), no engineer export UI, discussion topbar session-wide, merged sources per spec
