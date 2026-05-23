# Findings: Experiment 04 — Technical Requirements

> Scoring criteria: see `shared/evaluation-rubric.md`
> This is the **first-pass** record (iteration 0). Iterations log will be updated during the improvement phase.

---

## Iterations Log

| # | Prompt | What was missing / wrong | What it fixed |
|---|---|---|---|
| 1 | _(initial prompt — v1 spec)_ | — | Initial generation (v1) |
| 2 | _(initial prompt — v2 spec)_ | — | Fresh generation from corrected and expanded technical spec |

**Total prompts to reach final state:** TBD — tracked during iteration phase

---

## Second Pass Results (v2 Spec)

**MCP:** Remains the best of all four experiments. Everything present — add items, review items, classify, flag. Full engineer and facilitator workflow accessible via agent. The v2 spec fixes (correct quadrant labels, full prompt category list, discussion mode keyboard shortcuts, export modal tabs) all propagated correctly into the implementation.

**UI:** "Maybe the best." Grouped view present and working. Priority matrix nearly worked — closest of all four experiments. Very high quality overall. Export not great (consistent weakness across all experiments). The v2 spec's corrected `STRATEGIC` quadrant label and explicit component descriptions produced a noticeably more complete first pass than v1.

**Consistent strength:** Technical specs maintain quality across passes because the implementation space is fully defined. There's no guesswork on data model, API shape, MCP tools, or skill steps — Claude executes against the spec rather than inventing.

### v2 Score Adjustments
| Dimension | v1 Score | v2 Score | Change | Notes |
|---|---|---|---|---|
| Completeness | 3 | 4 | ↑ | Grouped view works; matrix nearly works; export still weak |
| Code Correctness | 3 | 4 | ↑ | More flows working correctly; matrix close but not perfect |
| Architecture & Design | 3 | 4 | ↑ | Correct data model (tpo/freq/energy); all quadrant labels right |
| MCP Quality | 5 | 5 | → | Maintained — full workflow, full CRUD, facilitator auth |
| Skills Quality | 4.5 | 4.5 | → | Maintained — three skills, PM tool formats, Given/When/Then |
| **Total** | **18.5** | **21.5** | ↑↑ | |

---

## Scores

| Dimension | Score (1–5) | Notes |
|---|---|---|
| Completeness | 3 | Full CRUD on activities (add, edit, delete — only experiment with this); MCP covers full workflow; UI has no link-sharing mechanism; reviewing mode in UI is broken |
| Code Correctness | 3 | Runs; MCP works perfectly during testing; UI reviewing mode broken; link sharing absent from UI |
| Architecture & Design | 3 | Technical PRD drove strong MCP design (facilitatorToken auth, real-time events via Socket.io, status transitions); UI over-engineered in places — reviewing mode exists but is broken; link sharing oversight suggests the spec listed features without surfacing the sharing flow as a product moment |
| MCP Quality | 5 | Best of all four: complete workflow coverage (create_session, join_session, add_activity, update_activity, list_activities, flag_activity, close_session, export_session); facilitatorToken auth is the only experiment with access control; real-time Socket.io events on mutations; correct facilitator link returned during testing |
| Skills Quality | 4.5 | Most production-ready skill set: PM tool formats (Linear/Jira/GitHub), Given/When/Then acceptance criteria, 0–6 scoring model, explicit effort estimation; minor gap: flag_activity requires facilitatorToken which skills don't mention |
| **Total** | **18.5** | |

---

## Observations

### What Claude built in one shot
The most technically complete application. Full CRUD on activities in the UI. MCP server with 8 tools covering the entire workflow including join_session, update_activity, and export_session — the most comprehensive tool set. Skills that reference external PM systems. FacilitatorToken-based auth is the only experiment to implement access control on the agent surface.

Data model: `title`, `timeEstimate` (quick/medium/significant), `enjoyment` (yes/meh/no), `repetitive` (yes/sometimes/no), `automatable` (yes/maybe/no), `flaggedByFacilitator`.

### What it got right unprompted
- Full CRUD on activities — the only experiment with edit and delete
- `join_session` tool — agents can register as participants, not just submit on behalf of unnamed users
- `update_activity` tool — ownership check (participantId must match) is a sensible constraint
- FacilitatorToken auth on `flag_activity` and `close_session` — the only experiment to implement role-based access control on the agent surface
- `export_session` — complete structured JSON export, cleanest data export of all four
- Socket.io events on mutations (`activity:added`, `activity:updated`, `activity:flagged`, `session:statusChanged`) — real-time design is architecturally correct
- Skills reference PM tool formats (Linear, Jira, GitHub Issues) — shows the technical spec prompted tool-integration thinking

### What it missed or got wrong
- No link-sharing mechanism in the UI — the most critical usability gap given that session sharing is the first thing a facilitator needs to do
- UI reviewing mode exists but is broken
- Skills don't mention the facilitatorToken requirement for flag_activity — an agent following the skill will fail on that step
- The status transition in close_session allows setting any status (open/reviewing/closed) — the skill doesn't enforce the correct progression

### MCP surface specifically
Best MCP of all four. Every tool needed for a complete agent-driven session — from creation through export — is present and correctly implemented. FacilitatorToken auth adds a meaningful security boundary. Socket.io integration means UI updates in real-time when an agent adds activities. During testing, everything worked on the first try and the correct facilitator link was returned.

### Skills surface specifically
Most structured skill set. `draft-backlog` (score 5/5) is the standout: it produces PM-tool-ready output with acceptance criteria, effort estimates, and format options for Linear/Jira/GitHub. `find-best-opportunities` uses an explicit 0–6 scoring model with bonus signals.

Runtime coherence: **4/5** — all tools exist; minor gap is that `flag_activity` requires a `facilitatorToken` that the skills don't surface to the user.

### Iteration breakdown
- UI: Needs link-sharing mechanism added; reviewing mode needs to be fixed
- MCP: Near-complete; skills need to mention facilitatorToken requirement for flag_activity
- Skills: Strong; update flag_activity step to include facilitatorToken

---

## Key Takeaway

A full technical PRD produced the most complete and coherent agent surface (the only experiment where MCP testing worked perfectly on the first try), but the prescriptive detail created an over-engineered result — the UI's most critical user moment (sharing the session link) was missing, and the reviewing mode was built but broken.
