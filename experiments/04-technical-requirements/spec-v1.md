# Spec v1: Technical Requirements (archived)

> Original spec used in first-pass experiment. Archived when v2 specs were extracted from the Claude Design file.

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
  id: string;
  name: string;
  createdAt: Date;
  facilitatorToken: string;
  participants: Participant[];
  activities: Activity[];
  status: 'open' | 'reviewing' | 'closed';
};

type Participant = {
  id: string;
  name: string;
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
- Add activity card: title + 4 radio-group questions
- Edit/delete own activities while session is `open`
- See other participants' cards in real time

### Epic 3 — Facilitator View
- Separate UI panel, accessible via facilitator token
- Controls: Open → Reviewing → Closed status transitions
- Activities grouped by `automatable` value
- Facilitator can flag individual activities
- Export: CSV download

### Epic 4 — Realtime Sync
- Socket.io events: participant joins, activity added/edited/deleted, session status change, facilitator flags

### Epic 5 — MCP Server
| Tool | Description |
|---|---|
| `create_session` | Create session; returns sessionId and facilitatorToken |
| `get_session` | Fetch full session state |
| `join_session` | Join as named participant |
| `add_activity` | Add activity with all four tag fields |
| `update_activity` | Edit existing activity |
| `list_activities` | List activities, optionally filtered |
| `flag_activity` | Facilitator-only: toggle flagged state |
| `close_session` | Facilitator-only: transition session status |
| `export_session` | Return all session data as JSON |

### Epic 6 — AI Skills
1. **`summarize-session`** — plain-English summary of what the team does
2. **`find-best-opportunities`** — filters high-automatable + significant time/repetitiveness; ranks by impact
3. **`draft-backlog`** — produces draft backlog items ready to paste into a PM tool
