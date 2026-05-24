# Toil Tracker Starter

This is an existing project. Extend it; do not restructure it.

## Layout

- `src/server.ts` — single entry point. Next.js, Express, Socket.io, and MCP all run here in one Node.js process on port 3060.
- `src/store.ts` — in-memory storage. Extend with domain types here.
- `src/mcp.ts` — MCP server and tools. Extend with domain tools here.
- `app/` — Next.js App Router frontend (client-side React).
- `lib/socket.ts` — Socket.io client (same-origin).
- `skills/` — AI skill files. Add `<name>/SKILL.md` directories.

## Tech

Next.js (custom server) + Express + Socket.io + `@modelcontextprotocol/sdk`, all in one Node.js process. TypeScript throughout. In-memory storage only.
