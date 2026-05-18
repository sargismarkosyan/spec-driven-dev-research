# Experiment 04 — Technical Requirements
# Paste everything between the triple backticks as your first message in a fresh Claude Code session.

```
You are extending an existing application. The codebase in the current directory is a working starter — a minimal multi-user shared-canvas app built with Next.js (custom server), Express, Socket.io, and an MCP server, all running in one Node.js process on port 3040. See CLAUDE.md for the project layout.

Your task is to evolve this starter into the Toil Tracker application described in the spec below.

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

A real-time collaborative web app for running engineering team work-audit sessions. Two user roles: Engineer (submits and tags activities) and Facilitator (runs the session, surfaces low-effort high-value improvement opportunities). Single-session, no authentication for participants. Ships as four outputs: web UI, REST API, MCP server, and AI skills.

## Tech Stack

- **Single Node.js server:** Next.js (custom server) + Express + Socket.io, all running in one process on one port
- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS — served by the same Node.js process
- **Realtime:** Socket.io attached to the same HTTP server
- **Storage:** In-memory (sessions expire after 24h); no database required
- **MCP Server:** Streamable HTTP MCP server mounted on the same Express instance at `/mcp`
- **Deployment target:** Single server / Docker container

## Data Model

```ts
type Session = {
  id: string;                  // nanoid, used in share URL
  name: string;
  createdAt: Date;
  facilitatorToken: string;    // secret token for facilitator view
  participants: Participant[];
  activities: Activity[];
  status: 'open' | 'reviewing' | 'closed';
};

type Participant = {
  id: string;
  name: string;                // self-reported on join
  sessionId: string;
};

type Activity = {
  id: string;
  participantId: string;
  title: string;
  timeEstimate: 'quick' | 'medium' | 'significant';
  enjoyment: 'yes' | 'meh' | 'no';
  repetitive: 'yes' | 'sometimes' | 'no';
  automatable: 'yes' | 'maybe' | 'no';
  flaggedByFacilitator: boolean;
};
```

## Epics

### Epic 1 — Session Management
- `POST /api/sessions` — create session, returns `{ sessionId, facilitatorToken }`
- `GET /api/sessions/:id` — fetch session state
- Facilitator accesses their view at `/session/:id?facilitator=<facilitatorToken>`
- Participants join at `/session/:id`

### Epic 2 — Engineer Flow
- On join: enter name, land on activity board
- Add activity card: title (text input) + 4 radio-group questions
- Edit/delete own activities while session is `open`
- See other participants' cards in real time (name visible, read-only)

### Epic 3 — Facilitator View
- Separate UI panel, accessible via facilitator token
- Controls: Open → Reviewing → Closed status transitions
- Activities grouped by `automatable` value (yes / maybe / no columns)
- Facilitator can flag individual activities (star/highlight)
- Export: CSV download of all activities with all fields

### Epic 4 — Realtime Sync
- All connected clients receive updates via WebSocket on:
  - Participant joins
  - Activity added / edited / deleted
  - Session status change
  - Facilitator flags an activity

### Epic 5 — MCP Server
Expose session operations as an MCP server at `/mcp` (streamable HTTP transport).

| Tool | Description |
|---|---|
| `create_session` | Create a new session; returns sessionId and facilitatorToken |
| `get_session` | Fetch full session state by sessionId |
| `join_session` | Join a session as a named participant; returns participantId |
| `add_activity` | Add an activity with all four tag fields |
| `update_activity` | Edit an existing activity by activityId |
| `list_activities` | List all activities in a session, optionally filtered by automatable value |
| `flag_activity` | Facilitator-only: toggle the flagged state of an activity |
| `close_session` | Facilitator-only: transition session status |
| `export_session` | Return all session data as structured JSON |

### Epic 6 — AI Skills
Ship three skills as `SKILL.md` files (Anthropic Claude Skills format).

1. **`summarize-session`** — Takes a sessionId, calls `get_session` and `list_activities`, returns a plain-English summary of what the team does, with counts by automation potential.
2. **`find-best-opportunities`** — Filters for activities that are both high-automatable and significant in time cost or repetitiveness; ranks by combined impact; returns the facilitator's shortlist with rationale.
3. **`draft-backlog`** — Takes the prioritized list and produces draft backlog items (title + acceptance criteria) ready to paste into a project management tool.

## Non-Functional Requirements

- Works with 20 concurrent participants
- Mobile-friendly (engineers may join on phone)
- No persistent storage — session data lives in memory only
- Single deployable artifact — Next.js and the API run in the same Node.js process
- MCP server runs on the same process as the REST API
---
```
