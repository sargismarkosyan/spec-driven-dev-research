# Work Audit — Specification Index

Work Audit is a real-time collaborative web application for engineering teams to audit their recurring work during retrospective sessions. It replaces the quarterly retrospective conversation with a structured, time-boxed activity where engineers submit the recurring work they perform, characterize how that work feels, and collectively decide what should be automated, investigated, or accepted as permanent.

This specification is the authoritative reference for all implementation work. Every feature, field, rule, and formula in the system must trace back to a requirement stated here.

When spec files disagree with each other or with the reference implementation, see **[IMPLEMENTATION-INDEX.md](./IMPLEMENTATION-INDEX.md)** for the resolved canonical behavior (aligned with experiment 05, v0.3).

---

## How to Read This Spec

The specification is organized into two top-level sections. The overview section describes the product at the human level — who uses it, what they can do, and how a session progresses from start to finish. The data-model section describes the system at the structural level — every entity, every field, every enumeration value, and every derived calculation.

Cross-references between files use relative markdown paths. Enumeration values are written in `code style` to match their wire format. Formula descriptions use plain English; no code blocks appear in this specification.

For conflict resolution against the reference implementation, start with [IMPLEMENTATION-INDEX.md](./IMPLEMENTATION-INDEX.md).

---

## Sections

### Implementation Index

| File | Contents |
|---|---|
| [IMPLEMENTATION-INDEX.md](./IMPLEMENTATION-INDEX.md) | Canonical resolutions for spec conflicts (energy enum, export, discussion visibility, ID formats, merge visibility) aligned with experiment 05 |

### 01 — Overview

| File | Contents |
|---|---|
| [01-overview/README.md](./01-overview/README.md) | Product purpose, research context, and the four output surfaces |
| [01-overview/user-roles.md](./01-overview/user-roles.md) | Facilitator and Engineer roles — permissions, identification, and UI experience |
| [01-overview/session-lifecycle.md](./01-overview/session-lifecycle.md) | The four session statuses, transition triggers, and per-role behavior at each status |

### 02 — Data Model

| File | Contents |
|---|---|
| [02-data-model/README.md](./02-data-model/README.md) | Introduction to the three core entities and their relationships |
| [02-data-model/session.md](./02-data-model/session.md) | Session entity — all fields with types, defaults, and constraints |
| [02-data-model/participant.md](./02-data-model/participant.md) | Participant entity — all fields, color/initials derivation, reconnection behavior |
| [02-data-model/activity.md](./02-data-model/activity.md) | Activity entity — all fields including merge tracking and relationship fields |
| [02-data-model/enumerations.md](./02-data-model/enumerations.md) | All enumerations: tpo, freq, energy, teamAuto, role — with all label variants and numeric values |
| [02-data-model/calculations.md](./02-data-model/calculations.md) | All derived calculations: effort, display formatting, perceived cost, matrix coordinates, quadrants |

### 03 — Engineer Flow

| File | Contents |
|---|---|
| [03-engineer-flow/README.md](./03-engineer-flow/README.md) | Engineer journey overview |
| [03-engineer-flow/join-screen.md](./03-engineer-flow/join-screen.md) | Join form, role selector, validation, localStorage, navigation |
| [03-engineer-flow/board-lobby.md](./03-engineer-flow/board-lobby.md) | Waiting state before facilitator starts; smart routing logic |
| [03-engineer-flow/board-active.md](./03-engineer-flow/board-active.md) | Active submission state: center panel, cards, inline editing, soft-delete |
| [03-engineer-flow/board-discussion.md](./03-engineer-flow/board-discussion.md) | Read-only discussion state, verdict chips, flagged sidebar |
| [03-engineer-flow/add-activity-form.md](./03-engineer-flow/add-activity-form.md) | Form fields, QuestionBlocks, pre-fill behavior, save/cancel |
| [03-engineer-flow/prompt-rail.md](./03-engineer-flow/prompt-rail.md) | Prompt categories, expand/collapse, pre-fill behavior |
| [03-engineer-flow/team-feed.md](./03-engineer-flow/team-feed.md) | Live team feed, visibility conditions, liveTeamFeed flag |
| [03-engineer-flow/suggestions.md](./03-engineer-flow/suggestions.md) | Suggestion generation, deduplication, count, tap-to-prefill |

### 04 — Facilitator Flow

| File | Contents |
|---|---|
| [04-facilitator-flow/README.md](./04-facilitator-flow/README.md) | Facilitator journey overview |
| [04-facilitator-flow/create-session.md](./04-facilitator-flow/create-session.md) | Form fields, defaults, category selection, live-feed toggle, window picker |
| [04-facilitator-flow/lobby.md](./04-facilitator-flow/lobby.md) | Share link, participant list, start button condition |
| [04-facilitator-flow/live-view.md](./04-facilitator-flow/live-view.md) | Per-person counts, live stream, themes, frequency distribution |
| [04-facilitator-flow/matrix-view.md](./04-facilitator-flow/matrix-view.md) | Quadrant layout, dot positioning, clustering, dot sizes, legend, sidebar |
| [04-facilitator-flow/grouped-view.md](./04-facilitator-flow/grouped-view.md) | 3 columns, sort tabs, unclassified section, card display |
| [04-facilitator-flow/discuss-view.md](./04-facilitator-flow/discuss-view.md) | Mini matrix, pending tray, sidebar, classify buttons, keyboard shortcuts |
| [04-facilitator-flow/edit-modal.md](./04-facilitator-flow/edit-modal.md) | Fields, permissions, edit history, delete button |
| [04-facilitator-flow/merge-modal.md](./04-facilitator-flow/merge-modal.md) | Source card, checklist candidates, similarity, preview |
| [04-facilitator-flow/export-modal.md](./04-facilitator-flow/export-modal.md) | Markdown preview, filename, copy/download |

### 05 — Real-Time

| File | Contents |
|---|---|
| [05-real-time/README.md](./05-real-time/README.md) | Architecture overview: single Node.js process, Socket.io room per session |
| [05-real-time/client-to-server.md](./05-real-time/client-to-server.md) | All events emitted by client with payloads, validations, permission checks |
| [05-real-time/server-to-client.md](./05-real-time/server-to-client.md) | All events broadcast by server with payloads, dedup behavior |

### 06 — REST API

| File | Contents |
|---|---|
| [06-rest-api/README.md](./06-rest-api/README.md) | Overview, auth model, error format |
| [06-rest-api/session-endpoints.md](./06-rest-api/session-endpoints.md) | POST /sessions, GET /sessions/:id, start, extend, close |
| [06-rest-api/activity-endpoints.md](./06-rest-api/activity-endpoints.md) | POST, PUT, DELETE activities; classify, flag, note, merge, merge-candidates, export |

### 07 — MCP Server

| File | Contents |
|---|---|
| [07-mcp-server/README.md](./07-mcp-server/README.md) | Transport (streamable HTTP at /mcp), auth model, read-only constraint |
| [07-mcp-server/tools.md](./07-mcp-server/tools.md) | All 4 tools: list_sessions, get_session, export_session_markdown, list_activities |

### 08 — AI Skills

| File | Contents |
|---|---|
| [08-ai-skills/README.md](./08-ai-skills/README.md) | Skill system overview |
| [08-ai-skills/summarize-session.md](./08-ai-skills/summarize-session.md) | Steps, computed stats, output format |
| [08-ai-skills/find-best-opportunities.md](./08-ai-skills/find-best-opportunities.md) | Steps, scoring formula, ranking, human-gate rule |
| [08-ai-skills/draft-backlog.md](./08-ai-skills/draft-backlog.md) | Steps, per-item format, size estimates, format options |

### 09 — Design System

| File | Contents |
|---|---|
| [09-design-system/README.md](./09-design-system/README.md) | Design philosophy: warm paper palette, Newsreader serif + IBM Plex |
| [09-design-system/color-tokens.md](./09-design-system/color-tokens.md) | All CSS custom properties with hex values and semantic usage |
| [09-design-system/typography.md](./09-design-system/typography.md) | Font families, wa-eyebrow, wa-display, wa-mono classes |
| [09-design-system/components.md](./09-design-system/components.md) | Every wa-* CSS class and component behavior |
| [09-design-system/layout-patterns.md](./09-design-system/layout-patterns.md) | wa-screen, topbar, 2-col/3-col layouts, modal patterns |

### 10 — Business Rules

| File | Contents |
|---|---|
| [10-business-rules/README.md](./10-business-rules/README.md) | Overview of all rule categories |
| [10-business-rules/permissions.md](./10-business-rules/permissions.md) | Role-based access table, ownership checks, token auth |
| [10-business-rules/timer-rules.md](./10-business-rules/timer-rules.md) | Countdown logic, urgency threshold, extend snap-forward logic |
| [10-business-rules/merge-rules.md](./10-business-rules/merge-rules.md) | Similarity formula, threshold, merge record structure, source marking |
| [10-business-rules/suggestion-rules.md](./10-business-rules/suggestion-rules.md) | Dedup logic, 30-char key, max 4, sorted by count |
| [10-business-rules/soft-delete.md](./10-business-rules/soft-delete.md) | 5-second undo toast, drain animation, unmount cancellation |
| [10-business-rules/reconnection.md](./10-business-rules/reconnection.md) | Socket rebind by name, participant persistence, activity re-targeting |

### 11 — Non-Functional

| File | Contents |
|---|---|
| [11-non-functional/README.md](./11-non-functional/README.md) | Concurrency, mobile, storage, single-process (port 3050), auth model summary |

---

## Key Concepts at a Glance

- A **session** is the unit of work — one team, one audit, one facilitator.
- A **participant** is any person connected to the session. The facilitator is a special participant.
- An **activity** is a single recurring work item submitted by an engineer.
- Three dimensions describe each activity: **time per occurrence** (tpo), **frequency** (freq), and **energy level** (energy).
- Two derived values are computed from those dimensions: **effort** (hours per week) and **perceived cost** (effort weighted by energy drain).
- The facilitator assigns a **team automatability verdict** (teamAuto) to each activity during the discussion phase.
- All data is held in memory for the lifetime of the server process. There is no persistent storage.
