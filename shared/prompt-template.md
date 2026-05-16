# Prompt Template

The constant part of every experiment prompt. The spec and UI guide are **pasted inline** into the prompt — not read from files. This eliminates a variable (whether Claude correctly locates and reads the right files before starting).

---

## How to Run an Experiment

1. Open a fresh Claude Code session with the working directory set to `experiments/<experiment-id>/output/`.
2. Construct the prompt by taking the template below and substituting:
   - `[UI GUIDE CONTENTS]` ← full content of `shared/ui-guide.md`
   - `[SPEC CONTENTS]` ← full content of the experiment's `spec.md`
3. Paste the full prompt as the first message.
4. After Claude's first response, evaluate against the stopping criterion below.
5. If the criterion is not met, send a follow-up prompt requesting the missing pieces. Log each follow-up in `findings.md` iterations table before sending.
6. When the criterion is met, stop and score in `findings.md`.

## What Counts as an Iteration

- Any prompt sent after the initial one that requests additional code changes.
- Pure questions (e.g., "why did you choose this design?") do **not** count.
- A single follow-up message can contain multiple requests; it counts as one iteration.

## Stopping Criterion

Stop iterating when **all** of the following are true:

- `npm run dev` starts the app without errors.
- The engineer flow works end to end: join with a name → add an activity with the four tag fields → see it appear on the board.
- The facilitator flow works end to end: access the facilitator view → see activities grouped by automation potential → flag an item → export the result.
- The MCP server responds at `/mcp` with the domain tools the spec calls for (or, for less prescriptive specs, with tools Claude inferred from the domain).
- At least one valid `SKILL.md` exists in `skills/`.

If the spec doesn't prescribe a feature (e.g., spec 01 doesn't mention session status transitions), Claude's reasonable interpretation is sufficient — we are measuring what each spec drives Claude to produce, not whether Claude produced spec-04's feature set.

---

## The Prompt

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

UI layout reference:
---
[UI GUIDE CONTENTS]
---

Spec:
---
[SPEC CONTENTS]
---
```

---

## What Stays Constant Across All Experiments

- The starter codebase (including `CLAUDE.md`)
- The prompt wrapper above
- The UI guide
- The model: Claude Sonnet 4.6
- A fresh Claude Code session with no prior context
- The stopping criterion

## What Changes

- The spec (the variable we are testing)
