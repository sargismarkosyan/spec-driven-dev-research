# Toil Tracker — Starter

Minimal working foundation for all four spec experiments. Every experiment begins from a copy of this directory.

## Structure

```
src/
  server.ts     ← single entry point: Express + Socket.io + MCP + Next.js
  store.ts      ← in-memory storage (extend with domain types)
  mcp.ts        ← MCP tools (extend with domain tools)
app/            ← Next.js frontend (App Router)
lib/
  socket.ts     ← Socket.io client (same-origin)
skills/         ← AI skill files (SKILL.md format)
```

## Running

```bash
npm install
npm run dev     # http://localhost:3060
```

One command. One port. Everything on `localhost:3060`:
- `/` and `/canvas` → Next.js frontend
- `/api/*` → REST API
- `/mcp` → MCP server (streamable HTTP)

## What to extend

- **Storage:** add domain types to `src/store.ts`
- **REST routes:** add to `src/server.ts` under REST API section
- **WebSocket events:** add to `src/server.ts` under Socket.io section
- **MCP tools:** add to `src/mcp.ts`
- **Skills:** add `<name>/SKILL.md` files to `skills/`
- **Frontend:** extend `app/` pages with domain UI
