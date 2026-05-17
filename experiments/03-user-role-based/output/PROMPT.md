# Experiment 03 — User Role Based Action
# Paste everything between the triple backticks as your first message in a fresh Claude Code session.

```
You are extending an existing application. The codebase in the current directory is a working starter — a minimal multi-user shared-canvas app built with Next.js (custom server), Express, Socket.io, and an MCP server, all running in one Node.js process on port 3000. See CLAUDE.md for the project layout.

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
## Context

Engineering teams do periodic retrospectives, but standard retro formats (Start/Stop/Continue, 4Ls) don't address the underlying question: what work are we doing, and should we still be doing it that way?

This tool is built for a specific retro format: the work audit. It replaces one retrospective session per quarter. The facilitator runs the session; engineers participate in real time.

## Users and Their Goals

### Engineer
- Wants their pain points heard and acted on
- Doesn't want overhead — submitting activities should be fast
- Wants to see what colleagues are doing (transparency, not surveillance)

### Facilitator
- Wants to understand the full landscape of what their team does day-to-day
- Needs to identify the highest-ROI automation targets before the next planning cycle
- Runs the session in a meeting — wants minimal facilitation overhead
- Reviews results after the session and uses them to inform the backlog

## The Flow

1. Facilitator creates a session and shares the link in the meeting
2. Engineers join (no login) and spend ~10 minutes listing their recurring activities
3. For each activity, they answer four quick questions:
   - How long does this take? (quick / medium / significant)
   - Do you enjoy it? (yes / meh / no)
   - Is it repetitive? (yes / sometimes / no)
   - Could it be automated or replaced by a tool? (yes / maybe / no)
4. Facilitator switches to the results view — all activities are visible, grouped by automation potential
5. Team discusses, facilitator marks priorities
6. Facilitator exports the prioritized list

## What Makes This Different

- No login required for engineers — friction must be near zero
- The four-question tagging model is fixed — not configurable — to keep sessions focused
- The facilitator has a separate view with aggregation controls; engineers see a simple card board
- This is a single-session tool — no ongoing project management, no account history

## On MCP and Skills

The application should also be accessible to AI agents and AI assistants:
- Expose an MCP server so that a facilitator's AI assistant can query session data, flag activities, and generate summaries without leaving their AI tool
- Ship AI skills (Anthropic Claude Skills format) that package the most common facilitator workflows: summarizing session output, identifying the best automation candidates, and drafting a backlog from the results
---
```
