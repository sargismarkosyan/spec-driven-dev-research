# Experiment 03 — User Role Based
# Paste everything between the triple backticks as your first message in a fresh Claude Code session.

```
You are extending an existing application. The codebase in the current directory is a working starter — a minimal multi-user shared-canvas app built with Next.js (custom server), Express, Socket.io, and an MCP server, all running in one Node.js process on port 3030. See CLAUDE.md for the project layout.

Your task is to evolve this starter into the application described in the spec below.

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

Engineering teams do periodic retrospectives, but standard retro formats (Start/Stop/Continue, 4Ls) don't address the underlying question: *what work are we doing, and should we still be doing it that way?*

This tool is built for a specific retro format: the **work audit**. It replaces one retrospective session per quarter. The facilitator runs the session; engineers participate in real time.

## Users and Their Goals

### Engineer
The engineer is at the core of this tool. This is the person whose work is being reviewed.

- Wants to improve their own work process — not just vent, but actually change things
- Needs to capture what they know about their recurring activities honestly and quickly
- Doesn't want overhead — submitting should be fast, the tool should stay out of the way
- Wants to see what colleagues are submitting in real time — it helps jog their memory for activities they might not have thought of

### Facilitator
The facilitator runs the session and owns the outcome.

- Wants to identify what is **draining the team the most** and **costing the most time** — that intersection is the priority
- Needs to quickly scan across the team's activities; wants aggregation and filtering that surfaces the right things, not a wall of cards to read
- Needs to run discussion efficiently: walk through activities one by one, get the team's verdict on each, flag priorities as they emerge
- Takes the session output and turns it into concrete next steps: flagged items, a prioritized list, backlog entries
- Acts as a **curator** throughout the session — merging near-duplicate submissions, editing for clarity, and removing irrelevant cards — without erasing authorship

---

## The Flow

1. Facilitator creates a session: enters a name, picks an optional submission window (5 / 10 / 15 / 20 minutes or untimed), selects which prompt categories will be shown to engineers, and toggles whether engineers see each other's submissions in real time
2. Facilitator shares the join link in the meeting — the lobby shows who has joined (name, role, join time) and allows the facilitator to nudge expected attendees who haven't arrived yet; the session starts when the facilitator is ready
3. Engineers join via link — no login, just a name (and an optional role: IC / EM / PM / UX / Other)
4. Everyone spends ~10 minutes listing their recurring activities on a three-column board:
   - **Left column — prompt rail**: categorized example activities (e.g. "Yesterday & this week", "Weekly meetings", "On-call & incidents", "Manual chores") to help jog memory; tapping an example pre-fills the title of a new card only
   - **Center column — own cards**: the engineer's submitted activities; editable and deletable while the session is open
   - **Right column — team feed**: other participants' submissions arriving in real time; tapping a colleague's card pre-fills the title of a new draft (the engineer still answers all three questions themselves, since cadence and energy vary by role and experience)
5. For each activity, engineers answer exactly three questions:
   - **Time per occurrence** — Less than 30 min · 30 min – 2 hrs · About half a day · A full day or more
   - **Frequency** — Daily · Weekly · Monthly · Quarterly · Ad hoc / irregular
   - **Energy** — Energizes me · Neutral · Drains me
6. Automatability is **intentionally absent** from the engineer submission form. The note on the form states: "Automatable? Not asked here — the team decides together." Individuals often can't assess automation potential in isolation; the verdict is a collective judgment made during discussion, not a self-report
7. Facilitator closes the submission window and opens discussion
8. Team walks through each activity; facilitator clicks **Yes / Maybe / No** to classify automatability as the team talks — keyboard shortcuts **1 / 2 / 3** allow rapid classification without reaching for the mouse; the facilitator can add a discussion note, skip an activity to return to it later, or revisit a previous one
9. Facilitator flags priorities as discussion happens; flagged activities accumulate in a side rail as the running output list; a progress indicator shows how many activities remain
10. Facilitator exports flagged items or queries via MCP

---

## The Priority Signal

The headline view is a 2×2 matrix:
- **Y axis — Energy**: draining at top, energizing at bottom
- **X axis — Effort**: ~hours per week (computed from time × frequency, so daily-30min and weekly-half-day land near each other)
- **Dot colour** — automatability verdict (set during discussion)
- **Four quadrants**:
  - **PRIORITY** (top-right) — draining *and* expensive: fix it, remove it, or automate it first
  - **TOLERABLE** (top-left) — draining but low effort: worth discussing but not urgent
  - **STRATEGIC** (bottom-right) — energizing but expensive: protect it, don't reflexively automate it
  - **HEALTHY** (bottom-left) — energizing and low effort: leave it alone
- Clicking any dot opens a detail panel showing the full card and facilitator actions

---

## The Facilitator's Curation Role

The facilitator is not a passive observer during the submission phase. They maintain data quality in real time:

- **Edit**: any card can be edited at any time from any view. The edit dialog shows "Editing on behalf of [Name]" — the original author is always attributed. Every change is logged in an audit trail on the card, recording who changed what, from what value to what value, and when.
- **Merge**: when two engineers submit near-identical activities, the facilitator merges them into one card. The merge dialog shows candidate duplicates ranked by similarity score (word overlap, same frequency, same duration bucket). The merged card shows combined authorship and summed effort — a merged entry is a *stronger* signal than two separate ones. A lighter "Treat as related" option links two cards without merging them.
- **Remove**: irrelevant or accidental submissions can be removed immediately; all connected clients update instantly.

All three actions are available from every facilitator view — live stream, matrix, grouped, and discussion — so curation doesn't require switching contexts.

---

## What Makes This Different

- No login required for engineers — friction must be near zero
- Three questions only during submission; automatability is a team decision during discussion, not a self-report
- Late joiners are first-class — engineers can join after the round starts and see what's already been logged
- Submission window is soft and adjustable mid-session; facilitator can extend or end early
- Facilitator configures which prompt categories are shown — sessions for infra teams look different from product teams
- The edit dialog preserves authorship attribution — the facilitator edits *on behalf of* the engineer, never anonymously
- This is a single-session tool — no ongoing project management, no account history

---

## On MCP and Skills

The MCP server and AI skills are not for autonomous agents. They are for **engineers and facilitators using AI assistants** — a human behind the agent who wants to get more out of session data without switching tools. For example: a facilitator asking their AI assistant to summarize the session, surface the top candidates for automation, or draft a backlog — with the assistant using MCP to query session data and skills to structure the output.

Skills must not classify or flag activities autonomously. They surface candidates and ask the facilitator to confirm — the team verdict is a human decision.

---

## Deliverables

The application has four outputs:
1. **Web UI** — two distinct experiences: engineer activity board (prompt rail, own cards, live team feed) and facilitator panel (live stream, priority matrix, grouped view, discussion mode, export)
2. **REST API** — the backend the UI talks to; real-time updates via WebSocket
3. **MCP Server** — exposes session operations so AI assistants can act on behalf of engineers and facilitators
4. **AI Skills** — pre-built workflows: summarize session, identify high-drain high-effort automation candidates, draft backlog
---
```
