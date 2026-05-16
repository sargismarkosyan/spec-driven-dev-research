# Spec: Technical Requirements (Epic/PRD Style)

> Full PRD: data model, components, tech stack, and epic-style requirements.

---

## Overview

A real-time collaborative web app for running engineering team work-audit sessions. Single-session, no authentication for participants, minimal setup for the facilitator.

## Tech Stack

- **Frontend:** React + TypeScript, Tailwind CSS
- **Backend:** Node.js + Express
- **Realtime:** WebSockets (Socket.io)
- **Storage:** In-memory (sessions expire after 24h); no database required
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

## Non-Functional Requirements

- Works with 20 concurrent participants
- Mobile-friendly (engineers may join on phone)
- No persistent storage — session data lives in memory only
- Single deployable artifact (frontend served as static files from Express)
