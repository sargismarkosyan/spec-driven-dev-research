# Toil Tracker — Starter

Minimal working foundation for all four spec experiments. Every experiment begins from a copy of this directory.

## What's here

| Package | What it does |
|---|---|
| `frontend/` | Next.js app — join screen + shared canvas with real-time presence |
| `backend/` | Express + Socket.io — multi-user session, in-memory storage |
| `mcp-server/` | MCP server (HTTP transport) — initialized with one placeholder tool |
| `skills/` | Empty — ready for skill files |

## Running locally

```bash
# Terminal 1 — backend
cd backend && npm install && npm run dev

# Terminal 2 — MCP server
cd mcp-server && npm install && npm run dev

# Terminal 3 — frontend
cd frontend && npm install && npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:3001  
MCP server: http://localhost:3002/mcp

## What to extend

The starter has no domain logic — no sessions, no activities, no tagging. That's what the spec drives. The patterns are in place:

- **Storage:** extend `backend/src/store.ts` with your domain types
- **WebSocket events:** extend `backend/src/index.ts` with domain events
- **REST routes:** add routes to `backend/src/index.ts`
- **MCP tools:** add tools in `mcp-server/src/index.ts`
- **Skills:** add `SKILL.md` files to `skills/`
- **Frontend:** extend the Next.js pages with domain UI
