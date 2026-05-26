# Work Audit — Experiment 05: Claude Design

This is the implementation for experiment 05, built from Claude Design (claude.ai/design) mockups.
The design files are in `shared/design/`. Do not restructure this project — extend it.

## Layout

- `src/server.ts` — single entry point. Next.js, Express, Socket.io, and MCP all run here in one Node.js process on **port 3050**.
- `src/store.ts` — in-memory storage with Work Audit domain types.
- `src/mcp.ts` — MCP server and tools: list_sessions, get_session, export_session_markdown, list_activities.
- `app/` — Next.js App Router frontend (client-side React).
  - `app/page.tsx` — Create session (facilitator home)
  - `app/session/[id]/lobby/` — Facilitator lobby
  - `app/session/[id]/join/` — Engineer join
  - `app/session/[id]/board/` — Engineer activity board
  - `app/session/[id]/facilitator/` — Facilitator views: Live / Matrix / Grouped / Discuss / Export
  - `app/components/Primitives.tsx` — Shared UI: design tokens, Avatar, Chip, EffortPill, MatrixDot, etc.
- `lib/socket.ts` — Socket.io client (same-origin).

## Tech

Next.js (custom server) + Express + Socket.io + `@modelcontextprotocol/sdk`, all in one Node.js process on port 3050. TypeScript throughout. In-memory storage only.

## Data model (v0.3)

Engineers submit activities tagged with:
- **Time per occurrence**: `<30m | 30m-2h | half-day | day+`
- **Frequency**: `daily | weekly | monthly | quarterly | adhoc`
- **Energy**: `energizing | fine | tedious | draining` (note: design mocks used `neutral` — the wire value is `fine`)

Automatability (`yes | maybe | no | unclassified`) is **NOT** asked of engineers — it's team-classified during facilitator discussion.

Matrix: Y = energy (drains↑ / energizes↓), X = effort (~h/wk). Priority zone = top-right.

## Running

```bash
npm run dev   # http://localhost:3050
```
