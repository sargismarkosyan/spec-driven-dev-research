# Spec: Technical Requirements (Epic/PRD Style)

> Full PRD: data model, components, tech stack, and epic-style requirements.

---

## Overview

A real-time collaborative web app for running engineering team work-audit sessions. Single-session, no authentication for participants, minimal setup for the facilitator. Ships as four outputs: web UI, REST API, MCP server, and AI skills.

## Tech Stack

- **Frontend:** React + TypeScript, Tailwind CSS
- **Backend:** Node.js + Express
- **Realtime:** WebSockets (Socket.io)
- **Storage:** In-memory (sessions expire after 24h); no database required
- **MCP Server:** Streamable HTTP MCP server alongside the REST API
- **Deployment target:** Single server / Docker container

## Data Model

```ts
type Session = {
  id: string;           // nanoid, used in share URL
  name: string;
  createdAt: Date;
  leadToken: string;    // secret token for lead view
  participants: Participant[];
  activities: Activity[];
  status: 'open' | 'reviewing' | 'closed';
};

type Participant = {
  id: string;
  name: string;         // self-reported on join
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
  flaggedByLead: boolean;
};
```

## Epics

### Epic 1 — Session Management
- `POST /api/sessions` — create session, returns `{ sessionId, leadToken }`
- `GET /api/sessions/:id` — fetch session state
- Lead accesses their view at `/session/:id?lead=<leadToken>`
- Participants join at `/session/:id`

### Epic 2 — Participant Flow
- On join: enter name, land on activity board
- Add activity card: title (text input) + 4 radio-group questions
- Edit/delete own activities while session is `open`
- See other participants' cards in real time (name visible, read-only)

### Epic 3 — Lead View
- Separate UI panel for the session lead
- Controls: Open → Reviewing → Closed status transitions
- Activities grouped by `automatable` value (yes / maybe / no columns)
- Can flag individual activities (star/highlight)
- Export: CSV download of all activities with all fields

### Epic 4 — Realtime Sync
- All connected clients receive updates via WebSocket on:
  - Participant joins
  - Activity added / edited / deleted
  - Session status change
  - Lead flags an activity

### Epic 5 — MCP Server
Expose the app's domain operations as an MCP server at `/mcp` (streamable HTTP transport).

MCP tools to implement:

| Tool | Description |
|---|---|
| `create_session` | Create a new session; returns sessionId and leadToken |
| `get_session` | Fetch full session state by sessionId |
| `join_session` | Join a session as a named participant; returns participantId |
| `add_activity` | Add an activity with all four tag fields |
| `update_activity` | Edit an existing activity by activityId |
| `list_activities` | List all activities in a session, optionally filtered by automatable value |
| `flag_activity` | Lead-only: toggle the flagged state of an activity |
| `close_session` | Lead-only: transition session status |
| `export_session` | Return all session data as structured JSON |

### Epic 6 — AI Skills
Ship three skills as `SKILL.md` files (Anthropic Claude Skills format):

1. **`summarize-session`** — Takes a sessionId, calls `get_session` and `list_activities`, returns a plain-English summary of what the team does, with counts by automation potential.
2. **`prioritize-automation`** — Filters activities flagged by lead or marked automatable=yes, ranks them by time cost and repetitiveness, returns a prioritized list with rationale.
3. **`draft-backlog`** — Takes the prioritized list and produces a set of draft backlog items (title + acceptance criteria) ready to paste into a project management tool.

## Non-Functional Requirements

- Works with 20 concurrent participants
- Mobile-friendly (engineers may join on phone)
- No persistent storage — session data lives in memory only
- Single deployable artifact (frontend served as static files from Express)
- MCP server runs on the same process as the REST API
