# Experiment 04 — Technical Requirements
# Paste everything between the triple backticks as your first message in a fresh Claude Code session.

```
You are extending an existing application. The codebase in the current directory is a working starter — a minimal multi-user shared-canvas app built with Next.js (custom server), Express, Socket.io, and an MCP server, all running in one Node.js process on port 3040. See CLAUDE.md for the project layout.

Your task is to evolve this starter into the application described in the spec below.

Rules:
- Do not change the project structure or tech stack. Extend what is there.
- All surfaces live in one Node.js process on one port. Do not split into multiple packages.
- Extend `src/store.ts` with the domain types (replace or augment the existing `User`/`Note` types as appropriate).
- Extend `src/server.ts` with domain REST routes and Socket.io events.
- Extend `src/mcp.ts` with domain MCP tools.
- Add skill directories under `skills/` with `SKILL.md` files (Anthropic Claude Skills format).
- The frontend is client-side React under `app/` (Next.js App Router). No server-side rendering of business logic.

Spec:
---
## Overview

A real-time collaborative web app for running engineering team work-audit sessions. Two user roles: Engineer (logs recurring activities with three tags) and Facilitator (runs the session, drives discussion, surfaces priority work). Single-session, no authentication for participants. Ships as four outputs: web UI, REST API, MCP server, and AI skills.

---

## Tech Stack

- **Single Node.js server:** Next.js (custom server) + Express + Socket.io, all running in one process on one port
- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS
- **Realtime:** Socket.io attached to the same HTTP server; same-origin WebSocket
- **Storage:** In-memory only; no database required; sessions expire when process restarts
- **MCP Server:** Streamable HTTP MCP server (`@modelcontextprotocol/sdk`) mounted on the same Express instance at `/mcp`

---

## Data Model

```ts
type Session = {
  id: string;                     // nanoid(10), used in share URL
  name: string;
  createdAt: Date;
  facilitatorToken: string;       // nanoid(21), passed as ?token= query param for facilitator view
  status: 'open' | 'reviewing' | 'closed';
  submissionEndsAt: Date | null;  // null = untimed; soft — does not auto-close
  enabledCategories: string[];    // prompt categories shown to engineers; all 9 on by default
  liveFeedEnabled: boolean;       // whether engineers see each other's submissions; true by default
};

type Participant = {
  id: string;                     // nanoid(10)
  sessionId: string;
  name: string;
  role: 'IC' | 'EM' | 'PM' | 'UX' | 'other';  // defaults to 'IC'
  joinedAt: Date;
};

type Activity = {
  id: string;                     // nanoid(10)
  sessionId: string;
  participantId: string;
  title: string;
  tpo: '<30m' | '30m-2h' | 'half-day' | 'day+';        // time per occurrence
  freq: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
  energy: 'energizing' | 'neutral' | 'draining';
  teamAuto: 'yes' | 'maybe' | 'no' | 'unclassified';   // set during discussion only
  flaggedByFacilitator: boolean;
  mergedFrom: string[] | null;    // ids of activities merged into this one, null if not a merge
  editHistory: EditEntry[];
  createdAt: Date;
  updatedAt: Date;
};

type EditEntry = {
  editedBy: string;               // participantId or 'facilitator'
  editedAt: Date;
  changes: Record<string, { from: unknown; to: unknown }>;
};
```

**Effort calculation** (derived, never stored):
```ts
const TPO_HOURS: Record<Activity['tpo'], number> = {
  '<30m': 0.5, '30m-2h': 1.25, 'half-day': 4, 'day+': 8,
};
const FREQ_PER_WK: Record<Activity['freq'], number> = {
  daily: 5, weekly: 1, monthly: 0.23, quarterly: 0.077, adhoc: 0.3,
};
function effortHrsPerWk(a: Activity): number {
  return TPO_HOURS[a.tpo] * FREQ_PER_WK[a.freq];
}
function effortDisplay(hrs: number): string {
  if (hrs < 1)   return '<1 h/wk';
  if (hrs < 1.5) return '~1 h/wk';
  if (hrs < 8)   return `~${hrs.toFixed(1)} h/wk`;
  return '8+ h/wk';
}
```

**Matrix position** (for 2×2 scatter plot):
```ts
// X = effort normalised to 0–1 (cap at 8 h/wk)
// Y = energy weight: energizing=0, neutral=0.5, draining=1
const matrixX = (a: Activity) => Math.min(effortHrsPerWk(a) / 8, 1);
const matrixY = (a: Activity) => ({ energizing: 0, neutral: 0.5, draining: 1 }[a.energy]);
```

---

## REST API

All endpoints return JSON. Errors return `{ error: string }` with an appropriate HTTP status code.

### Sessions

```
POST /api/sessions
Body:   { name: string, submissionWindowMinutes?: number,
          enabledCategories?: string[], liveFeedEnabled?: boolean }
Return: { sessionId: string, facilitatorToken: string, shareUrl: string }

GET /api/sessions/:id
Return: { session: Session, participants: Participant[], activities: Activity[] }
        403 if sessionId not found
```

### Participants

```
POST /api/sessions/:id/join
Body:   { name: string, role?: Participant['role'] }
Return: { participantId: string }
        404 if session not found
        400 if session is closed
```

### Activities

```
POST /api/sessions/:id/activities
Body:   { participantId: string, title: string, tpo: Activity['tpo'],
          freq: Activity['freq'], energy: Activity['energy'] }
Return: { activity: Activity }
        400 if session is not 'open'
        403 if participantId not in session

PATCH /api/sessions/:id/activities/:actId
Body:   { participantId: string, title?: string, tpo?: ..., freq?: ..., energy?: ... }
        (facilitator: use token query param instead of participantId)
Return: { activity: Activity }

DELETE /api/sessions/:id/activities/:actId
Query:  ?token=<facilitatorToken>   (facilitator-only)
Return: 204

POST /api/sessions/:id/activities/:actId/merge
Body:   { targetId: string }        (facilitator-only, token via query param)
Return: { merged: Activity }        source and target replaced by merged card

PATCH /api/sessions/:id/activities/:actId/classify
Body:   { teamAuto: 'yes' | 'maybe' | 'no' }
Query:  ?token=<facilitatorToken>   (facilitator-only)
Return: { activity: Activity }

PATCH /api/sessions/:id/activities/:actId/flag
Body:   { flagged: boolean }
Query:  ?token=<facilitatorToken>   (facilitator-only)
Return: { activity: Activity }
```

### Session control

```
PATCH /api/sessions/:id/status
Body:   { status: 'reviewing' | 'closed' }
Query:  ?token=<facilitatorToken>   (facilitator-only)
Return: { session: Session }

PATCH /api/sessions/:id/submission-window
Body:   { endsAt: string | null }   (ISO 8601 or null for untimed)
Query:  ?token=<facilitatorToken>
Return: { session: Session }

GET /api/sessions/:id/export
Query:  ?token=<facilitatorToken>
Return: Markdown text (Content-Type: text/markdown)
        Lists all flagged activities with title, contributors, effort, teamAuto, editHistory notes
```

---

## Socket.io Events

All events are scoped to a room named `session:<sessionId>`. Clients join the room on page load.

```
Server → client:
  participant:joined     { participant: Participant }
  activity:added         { activity: Activity }
  activity:updated       { activity: Activity }
  activity:removed       { activityId: string }
  activity:merged        { merged: Activity, removedIds: string[] }
  activity:classified    { activityId: string, teamAuto: Activity['teamAuto'] }
  activity:flagged       { activityId: string, flagged: boolean }
  session:statusChanged  { status: Session['status'] }
  session:windowUpdated  { submissionEndsAt: string | null }
```

---

## UI Components

### Engineer views

**Join screen** — name input (required) + role selector (IC default, optional) + session name displayed prominently. Submit joins the session.

**Activity board** — three-column layout:
- Left: prompt rail with expandable categories — only those enabled by the facilitator at session creation are shown; full list: "Yesterday & this week", "Weekly meetings", "Monthly rituals", "On-call & incidents", "Quarterly cycles", "Manual chores", "Handoffs & coordination", "Things I wish we automated", "Other recurring work". Each category lists example activities as tappable chips that pre-fill the title only on a new card.
- Center: the engineer's own activity cards, newest at top. "Add activity" button opens an inline form with title input and three segmented controls (tpo / freq / energy). Own cards show edit and delete affordances.
- Right: live team feed showing all other participants' submitted activities, newest at top. Tapping any activity in the feed pre-fills the title only on a new draft card. Team feed is read-only.

### Facilitator views

**Create session screen** — session name input, optional submission window picker (5 min / 10 min / 15 min / 20 min / untimed), toggleable recall prompt category chips (9 categories; all on by default: "Yesterday & this week", "Weekly meetings", "Monthly rituals", "On-call & incidents", "Quarterly cycles", "Manual chores", "Handoffs & coordination", "Things I wish we automated", "Other recurring work"), live feed toggle (controls whether engineers see each other's submissions in real time; on by default). Returns share link immediately.

**Lobby** — shows session name, join link (copy button), QR code for the join URL, pre-written Slack message template (one-click copy), list of joined participants with name/role/join time, dashed "not yet joined" section for expected attendees with a Nudge button per person. "Start session" button is present once at least one engineer has joined.

**Live stream** — three-panel layout. Left sidebar: per-participant submission count list. Center: chronological feed of all submitted activities; each card shows participant avatar + name, title, tpo/freq/energy chips, effort pill (~h/wk); facilitator actions (edit / merge / remove) visible on hover. Right panel: emerging themes (auto-grouped topic clusters) and time-cost distribution bars showing effort breakdown across tpo buckets. Topbar: participant count, activity count, time remaining, extend/end controls.

**Priority matrix** — 2×2 scatter plot. X = effort (~h/wk), Y = energy drain (0=energizing, 1=draining). Dot colour: rust=yes, amber=maybe, slate=no, dashed outline=unclassified. Quadrant labels: PRIORITY (top-right), TOLERABLE (top-left), STRATEGIC (bottom-right), HEALTHY (bottom-left). Clicking a dot opens an inline detail panel on the right with the card's full details and facilitator actions. Topbar shows "X/Y classified" badge.

**Grouped view** — three columns: Automatable (Yes) / Maybe / Manual Forever (No); unclassified activities shown in a separate section until classification begins. Sort options: by Effort (default), Energy, or Person.

**Discussion mode** — split layout: priority matrix with pending tray on left; Now Reviewing panel on right showing one activity at a time. Large Yes / Maybe / No buttons classify teamAuto; keyboard shortcuts 1 / 2 / 3 map to Yes / Maybe / No. Discussion note textarea on the panel; note is saved with the activity and included in exports. Flag toggle marks priority. Prev and Skip navigation for revisiting or deferring. Growing flagged-priorities list shown in a side rail in order of flagging. Progress shown as "X remaining".

**Export modal** — three tabs: Markdown, CSV, and Send via MCP. Markdown tab: formatted preview of flagged activities; includes/excludes checklist (contributors, effort, verdict, discussion notes, edit history); configurable filename; Copy to clipboard and Download as `.md` buttons. CSV tab: same data as delimited rows. MCP tab: shows MCP connector status and send instructions if connector is detected. Callout: "automatability was classified by the team during discussion — not self-reported."

**Edit dialog** — shows "Editing on behalf of [name]" header. Title field (editable). Three attribute fields pre-filled. teamAuto field (facilitator can set or override). Flagged state toggle. Discussion note textarea. Collapsible edit history. Footer: "Remove activity" (left, destructive) · Cancel · Save changes.

**Merge dialog** — source card shown at top. Candidate list with similarity scores and score breakdown (semantic % + cadence match + tpo match). Merged result preview: combined author chips, summed effort pill, "Reported by X + Y". Settings: preserve both authors · sum effort · use source energy + cadence. Footer: "Treat as related" (lighter) · Cancel · Merge.

---

## Epics

### Epic 1 — Session Management
- `POST /api/sessions` creates session; store in memory; return sessionId, facilitatorToken, shareUrl
- Routes: `/session/:id` (engineer view), `/session/:id?token=X` (facilitator view)
- If token present and valid → render facilitator layout; otherwise → render engineer join/board

### Epic 2 — Engineer Flow
- Join screen → validate name → `POST /api/sessions/:id/join` → store participant → join socket room → render board
- Board renders three-column layout (prompt rail / own cards / team feed)
- Add activity form inline below board header; submits `POST /api/sessions/:id/activities`
- Own cards: edit opens inline form pre-filled; delete calls `DELETE` with participantId auth
- Team feed subscribes to `activity:added`, `activity:updated`, `activity:removed` events
- Late joiners: on board load, fetch full session state via `GET /api/sessions/:id` to populate existing cards

### Epic 3 — Facilitator View
- All three views (live, matrix, grouped) share the same session state; switching views is client-side tab navigation
- Live stream subscribes to all socket events and updates in real time
- Matrix recalculates positions whenever activities change; re-renders on `activity:classified`
- Grouped view re-groups when `activity:classified` fires
- Session controls (status, window) call `PATCH /api/sessions/:id/status` and `PATCH /api/sessions/:id/submission-window`

### Epic 4 — Facilitator Card Actions
- **Edit**: open dialog with pre-filled fields; on save call `PATCH /api/sessions/:id/activities/:actId?token=X`; server appends to editHistory; broadcast `activity:updated`
- **Merge**: open dialog; client fetches all session activities and computes similarity client-side (semantic approximation via word-overlap for MVP, or call an embedding endpoint if available); on confirm call `POST /api/sessions/:id/activities/:actId/merge?token=X`; server creates merged activity, removes source+target, broadcasts `activity:merged` with both IDs
- **Remove**: call `DELETE /api/sessions/:id/activities/:actId?token=X`; broadcast `activity:removed`

### Epic 5 — Discussion Mode
- Accessible from facilitator view after status is `reviewing`
- Activities rendered one at a time; "classify" buttons call `PATCH /api/sessions/:id/activities/:actId/classify?token=X`
- Flag button calls `PATCH /api/sessions/:id/activities/:actId/flag?token=X`
- Side rail shows growing list of flagged activities in order of flagging

### Epic 6 — Export
- `GET /api/sessions/:id/export?token=X` generates Markdown from flagged activities
- Template per activity:
  ```
  ### [title] (~Xh/wk)
  **Contributors:** Name, Name
  **Automatability:** yes/maybe/no (team verdict)
  **Tags:** tpo · freq · energy
  ```

### Epic 7 — MCP Server
Streamable HTTP transport at `/mcp`. All tools return `{ content: [{ type: 'text', text: JSON.stringify(...) }] }`.

```
create_session(name: string)
  → { sessionId, facilitatorToken, shareUrl }

get_session(sessionId: string)
  → { session, participants, activities }   // activities include computed effortHrsPerWk

join_session(sessionId: string, name: string, role?: string)
  → { participantId }

add_activity(sessionId: string, participantId: string,
             title: string, tpo: string, freq: string, energy: string)
  → { activity }

update_activity(sessionId: string, activityId: string, facilitatorToken: string,
                title?: string, tpo?: string, freq?: string, energy?: string)
  → { activity }

list_activities(sessionId: string,
                energy?: string, teamAuto?: string, flagged?: boolean,
                sortBy?: 'effort' | 'createdAt')
  → { activities }   // each includes effortHrsPerWk

classify_activity(sessionId: string, activityId: string,
                  facilitatorToken: string, teamAuto: 'yes' | 'maybe' | 'no')
  → { activity }

flag_activity(sessionId: string, activityId: string,
              facilitatorToken: string, flagged: boolean)
  → { activity }

close_session(sessionId: string, facilitatorToken: string,
              status: 'reviewing' | 'closed')
  → { session }

export_session(sessionId: string, facilitatorToken: string)
  → { markdown: string }
```

### Epic 8 — AI Skills

Three skills as `skills/<name>/SKILL.md` files.

**`summarize-session`**
1. Call `get_session` with the sessionId.
2. Call `list_activities` with no filters.
3. Compute: total count, effort distribution (sum by tpo bucket), energy breakdown (count per level), classification progress (% classified), flagged count.
4. Return a plain-English paragraph summary + a stats table. Format: "The team submitted X activities totalling ~Yh/wk across Z people. [Energy sentence]. [Classification status]."
5. Do not set any flags or classifications.

**`find-best-opportunities`**
1. Call `list_activities` filtered to `energy=draining` and sorted by effort descending.
2. Also fetch unclassified activities with energy=draining — flag these as "needs team discussion".
3. Score each activity: `score = effortHrsPerWk × (teamAuto === 'yes' ? 3 : teamAuto === 'maybe' ? 1.5 : 0)`.
4. Return a ranked list of top 5, with title, contributor(s), effort, teamAuto, and one-sentence rationale.
5. Ask facilitator to confirm before flagging any item. Do not classify — classification is a team decision.

**`draft-backlog`**
1. Call `list_activities` filtered to `flagged=true`.
2. For each flagged activity, draft a backlog item:
   - Title: action-oriented ("Automate X" or "Remove Y" or "Investigate Z")
   - Effort: ~Xh/wk currently, with note that this is the recurring cost
   - Contributors: who reported it
   - Acceptance criteria: one Given/When/Then stub
   - Size estimate: S (<1h/wk) / M (1–3h/wk) / L (3h+/wk)
3. Ask which format: Linear / Jira / GitHub Issues / plain Markdown.
4. Return formatted items ready to paste.

---

## Non-Functional Requirements

- Supports 20 concurrent participants per session
- Mobile-friendly — engineer submission works on a phone browser
- In-memory only — no database, no file writes; data lost on process restart
- Single process — Next.js, Express, Socket.io, and MCP server all run in one Node.js process on one port
- No authentication — facilitator access is gated by the token in the URL query param only
---
```
