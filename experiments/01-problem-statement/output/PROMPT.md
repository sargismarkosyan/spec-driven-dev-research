# Experiment 01 — Problem Statement Only
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
Engineering teams accumulate repetitive, manual work over time but rarely stop to examine it. There is no established practice for auditing what engineers actually do day-to-day — which means improvement opportunities go unnoticed, toil compounds, and the team keeps doing work that could be automated, eliminated, or handed off.

Two people experience this problem differently.

The engineer is closest to the work. They know which of their daily activities are painful, repetitive, or feel like a waste of time — but that knowledge stays in their head. There is no structured way to surface it, and no forcing function to make it visible to the rest of the team. Engineers want to improve their own work process but need a way to capture and communicate what they know.

The facilitator is responsible for turning that knowledge into action. They need to look across everything the team does and identify what is worth fixing — specifically what is low effort to address and high value to the team. Without a structured view of the team's work, this is guesswork.

We need a tool that brings these two people together in a focused session: engineers describe their work honestly, and the facilitator gets what they need to make good prioritization decisions.

Build the full application as four outputs: a web UI, a backend API, an MCP server that exposes the app's operations to AI agents, and AI skills for common workflows within the tool.
---
```
