# Prompt Template

The constant part of every experiment prompt. The spec is inserted at the end.
The UI guide (`shared/ui-guide.md`) is attached as context when running in Claude Code.

---

## Setup (before running)

Each experiment's `output/` is already pre-seeded with the starter.

Open a fresh Claude Code session with the working directory set to:
`experiments/<experiment-id>/output/`

---

## The Prompt

```
You are extending an existing application. The codebase in the current directory
is a working starter — a minimal multi-user canvas app built with Next.js (frontend),
Express + Socket.io (backend), an MCP server, and a skills directory.

Your task is to evolve this into the Toil Tracker application described in the spec below.

Rules:
- Do not change the project structure or tech stack. Extend what is there.
- The frontend and backend remain separate. The frontend talks to the backend via REST + WebSockets.
- Extend the MCP server in mcp-server/src/index.ts with domain tools for the Toil Tracker.
- Add skill files under skills/ following the format in skills/README.md.
- Do not use server-side rendering. The UI is a client-side Next.js app.

UI layout reference: see the attached ui-guide.md.

Spec:
---
[INSERT SPEC HERE]
---
```

---

## How to Run

1. Copy starter: `cp -r shared/starter/. experiments/<id>/output/`
2. Open a **fresh** Claude Code session in `experiments/<id>/output/`
3. Attach `shared/ui-guide.md` as context
4. Paste the prompt above with the experiment's `spec.md` content inserted
5. For each follow-up prompt, log it in `findings.md` iterations table before sending
6. Once done, fill in `findings.md` scores and observations

## What Stays Constant Across All Experiments

- The starter codebase (`shared/starter/`)
- The prompt wrapper above
- The UI guide (`shared/ui-guide.md`)
- The model: Claude Sonnet 4.6
- A fresh session with no prior context

## What Changes

- The spec (the variable we are testing)
