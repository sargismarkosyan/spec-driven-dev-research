# Work Audit — Experiment 07

Real-time collaborative work audit tool for engineering teams.

Engineers submit recurring activities tagged with time, frequency, and energy level. The facilitator classifies them for automatability and exports results.

## Tech Stack

- Next.js 14 (App Router + custom Express server)
- Socket.io (real-time collaboration, rooms per session)
- MCP server (`/mcp`) — read-only tools for AI agents
- Tailwind CSS + `wa-*` design system (Newsreader + IBM Plex fonts)
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
| `/session/{id}` | Smart router (→ join or facilitator hub) |
| `/session/{id}/join` | Engineer join screen |
| `/session/{id}/board` | Engineer board (lobby → active → discussion) |
| `/session/{id}/lobby?token=...` | Facilitator lobby |
| `/session/{id}/facilitator?token=...` | Facilitator hub (Live/Matrix/Grouped/Discuss) |
| `/api/sessions` | REST API |
| `/mcp` | MCP server (read-only) |

## Session Flow

```
Facilitator: / → create → /lobby → Start → /facilitator
Engineer:    /session/{id} → /join → /board (lobby → active → discussion)
```

## Facilitator Features

- Live tab: real-time submission stream, per-person counts, frequency chart
- Matrix tab: energy × effort scatter plot with quadrant classification
- Grouped tab: activities sorted into yes/maybe/no columns
- Discuss tab: keyboard-driven classification (1/2/3 keys), flag (f), skip (s)
- Edit modal: edit any activity field + add discussion note
- Merge modal: combine duplicate activities with similarity scoring
- Export modal: markdown export + MCP note

## Engineer Features

- 3-column board: prompt rail | activity list | suggestions + team feed
- Add activity form: time/frequency/energy questions with inline editing
- Soft delete with 5-second undo
- Read-only discussion view with flagged priorities sidebar

## AI Skills

See `skills/` for facilitator-facing AI prompt workflows:
- `skills/summarize-session/SKILL.md` — session summary paragraph + table
- `skills/find-best-opportunities/SKILL.md` — score and rank top 5 automation candidates
- `skills/draft-backlog/SKILL.md` — draft tickets from flagged activities

## MCP Tools

Connect any MCP-compatible AI agent to `/mcp`:
- `list_sessions` — list all sessions
- `get_session` — full session state
- `export_session_markdown` — markdown priority report
- `list_activities` — filter: all | flagged | automatable | draining
