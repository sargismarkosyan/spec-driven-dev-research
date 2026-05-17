# Experiment 02 — PM Requirements
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

UI layout reference:
---
# UI Layout Guide — Toil Tracker

Shared across all experiments. These sketches define the expected screen layout and key UI elements. They are not full mockups — the visual design, color, and component style are left to the builder. The layout and information hierarchy should stay close to what is shown here.

## Screen 1 — Home (Create or Join)

```
┌─────────────────────────────────────────┐
│                                         │
│            Toil Tracker                 │
│    Audit your work. Find what to fix.   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  Session name...                │   │
│   └─────────────────────────────────┘   │
│   [ Create Session ]                    │
│                                         │
│   ─────────── or ───────────           │
│                                         │
│   Join a session via a shared link.     │
│                                         │
└─────────────────────────────────────────┘
```

## Screen 2 — Join Screen (engineer clicks a share link)

```
┌─────────────────────────────────────────┐
│            Toil Tracker                 │
│                                         │
│   Joining: Q3 Work Audit                │
│                                         │
│   What's your name?                     │
│   ┌─────────────────────────────────┐   │
│   │  e.g. Sarah                     │   │
│   └─────────────────────────────────┘   │
│                                         │
│   [ Join Session ]                      │
│                                         │
└─────────────────────────────────────────┘
```

## Screen 3 — Engineer Board View

```
┌──────────────────────────────────────────────────────┐
│  Toil Tracker  │  Q3 Work Audit  │  👤 Sarah          │
├──────────────────────────────────────────────────────┤
│  [ + Add Activity ]                                  │
│                                                      │
│  ┌─────────────────┐   ┌─────────────────┐          │
│  │ Deploy to       │   │ Write weekly    │          │
│  │ staging         │   │ status email    │          │
│  │                 │   │                 │          │
│  │ ⏱ Medium       │   │ ⏱ Quick        │          │
│  │ 😐 Meh         │   │ 😞 No           │          │
│  │ 🔁 Yes         │   │ 🔁 Yes          │          │
│  │ 🤖 Maybe       │   │ 🤖 Yes          │          │
│  │           [edit]│   │           [edit]│          │
│  └─────────────────┘   └─────────────────┘          │
│                                                      │
│  3 colleagues are also adding activities...          │
└──────────────────────────────────────────────────────┘
```

## Screen 4 — Add / Edit Activity (modal)

```
┌──────────────────────────────────────────┐
│  Add Activity                       [✕]  │
│                                          │
│  What do you do?                         │
│  ┌────────────────────────────────────┐  │
│  │ e.g. "Deploy to staging"           │  │
│  └────────────────────────────────────┘  │
│                                          │
│  How long does it take?                  │
│  ● Quick   ○ Medium   ○ Significant      │
│                                          │
│  Do you enjoy it?                        │
│  ○ Yes   ● Meh   ○ No                   │
│                                          │
│  Is it repetitive?                       │
│  ● Yes   ○ Sometimes   ○ No             │
│                                          │
│  Could it be automated?                  │
│  ○ Yes   ● Maybe   ○ No                 │
│                                          │
│  [ Cancel ]          [ Add Activity ]    │
└──────────────────────────────────────────┘
```

## Screen 5 — Lead Results View

```
┌──────────────────────────────────────────────────────────────┐
│  Toil Tracker  │  Q3 Work Audit  │  Status: [Reviewing ▾]    │
├─────────────────────┬────────────────────┬───────────────────┤
│  ✅ Automate (8)    │  🤔 Maybe (12)     │  ❌ Keep (5)      │
├─────────────────────┼────────────────────┼───────────────────┤
│  ┌───────────────┐  │  ┌──────────────┐  │  ┌─────────────┐ │
│  │ Deploy to     │  │  │ Write weekly │  │  │ Team        │ │
│  │ staging       │  │  │ status email │  │  │ standup     │ │
│  │ Sarah · Med   │  │  │ Tom · Quick  │  │  │ Ali · Med   │ │
│  │ [★ Flag]      │  │  │ [★ Flag]     │  │  │ [★ Flag]    │ │
│  └───────────────┘  │  └──────────────┘  │  └─────────────┘ │
│                     │                    │                   │
│  ┌───────────────┐  │  ┌──────────────┐  │                   │
│  │ Run CI        │  │  │ Code review  │  │                   │
│  │ pipeline      │  │  │ allocation   │  │                   │
│  │ Tom · Quick   │  │  │ Sarah · Sig  │  │                   │
│  │ [★ Flag]      │  │  │ [★ Flag]     │  │                   │
│  └───────────────┘  │  └──────────────┘  │                   │
├─────────────────────┴────────────────────┴───────────────────┤
│  [ Export CSV ]                                              │
└──────────────────────────────────────────────────────────────┘
```

Navigation notes:
- Engineers only ever see Screens 2 and 3
- The lead accesses Screen 5 via a separate URL token (`?lead=<token>`)
- Screen 4 appears as a modal overlay on top of Screen 3
- No persistent navigation — this is a single-session, single-purpose tool
---

Spec:
---
## Users

- **Engineer** — the person whose work is being reviewed; wants to improve their own work process
- **Facilitator** — runs the session; wants to surface what is low effort to fix and high value to the team

## User Stories

- As an engineer, I can add my daily work activities to a shared board so the team can see what everyone is doing.
- As an engineer, I can tag each activity with attributes: how much time it takes, whether I enjoy it, whether it feels repetitive, and whether I think it could be automated.
- As a facilitator, I can see all activities across the team in one view and filter by attribute.
- As a facilitator, I can flag activities that appear low effort to fix and high value — and export that list.
- As a team, we can run this as a live session — everyone submits at the same time and we discuss the results together.
- As a facilitator using an AI assistant, I can query session data through MCP to get summaries and recommendations without leaving my AI tool.
- As a facilitator, I can use pre-built AI skills to summarize session results, identify the highest-value automation opportunities, and draft a backlog from the output.

## Acceptance Criteria

- A new session can be created with a name and shared via link.
- Engineers join the session and add activities without needing an account.
- Each activity has: title, time estimate (quick / medium / significant), enjoyment (yes / meh / no), repetitiveness (yes / sometimes / no), automation potential (yes / maybe / no).
- The facilitator view shows activities grouped by automation potential, with the ability to flag individual ones.
- Session data persists for at least the duration of the session.
- The application exposes an MCP server so a facilitator's AI assistant can query and act on session data programmatically.
- The application ships with AI skills for: summarizing session results, identifying low-effort high-value automation candidates, and drafting a backlog from the prioritized output.
---
```
