# Findings: Experiment 02 — PM Requirements

> Scoring criteria: see `shared/evaluation-rubric.md`
> This is the **first-pass** record (iteration 0). Iterations log will be updated during the improvement phase.

---

## Iterations Log

| # | Prompt | What was missing / wrong | What it fixed |
|---|---|---|---|
| 1 | _(initial prompt — v1 spec)_ | — | Initial generation (v1) |
| 2 | _(initial prompt — v2 spec)_ | — | Fresh generation from fully-detailed PM requirements |

**Total prompts to reach final state:** TBD — tracked during iteration phase

---

## Second Pass Results (v2 Spec)

**MCP:** The biggest improvement across all four experiments pass-to-pass. v1 was missing `create_session` and `add_activity`; v2 now has everything — add activity, mark automatable, facilitator view all present and working via MCP. **This flip was caused by one change in the spec**: the new acceptance criteria explicitly state *"The application exposes an MCP server so an AI assistant can create sessions, join as a participant, add activities, classify activities, flag items..."* — naming the operations was enough to trigger the right tool design.

**UI:** Noticeably better than v1. Live stream now includes suggestions (e.g. daily standup prompts). Had invite view. Controls present but not fully polished. Matrix didn't work. Export was not great. The overall impression: "If I iterate a bit more, this will have solid results."

**Key finding:** Adding explicit MCP/skills acceptance criteria to a PM spec — even just naming the operations — was sufficient to go from MCP score 2 to MCP score ~4. The spec language doesn't need to be technical; it just needs to enumerate what the agent surface can do.

### v2 Score Adjustments
| Dimension | v1 Score | v2 Score | Change | Notes |
|---|---|---|---|---|
| Completeness | 3 | 4 | ↑ | Live stream, invite view, suggestions all present; matrix broken |
| Code Correctness | 3 | 3.5 | ↑ | More flows working; matrix and export weak |
| Architecture & Design | 3 | 3.5 | ↑ | Better product thinking; live stream with suggestions shows domain understanding |
| MCP Quality | 2 | 4 | ↑↑ | Major jump: full engineer + facilitator workflow now present |
| Skills Quality | 3.5 | 3.5 | → | Three skills present; still thin on guardrails |
| **Total** | **14.5** | **18.5** | ↑↑ | |

---

## Scores

| Dimension | Score (1–5) | Notes |
|---|---|---|
| Completeness | 3 | UI is the most complete facilitator toolset (filtering, flagging, export, close session, copy engineer link); MCP missing create_session and add_activity — entire engineer workflow inaccessible via agent |
| Code Correctness | 3 | Runs; UI flows work; MCP testing required LM to fall back to direct API calls because add_activity tool was absent |
| Architecture & Design | 3 | PM user stories translated well into UI features; filtering and export show good domain understanding; missing MCP tools reveal the spec framing didn't naturally produce agent surface thinking |
| MCP Quality | 2 | Only facilitator-side tools present (get_session, list_activities, summarize_session, get_automation_candidates); missing create_session and add_activity means an agent cannot run the engineer workflow |
| Skills Quality | 3.5 | Three functional facilitator skills (summarize-session, prioritize-automation, draft-backlog); concise and tool-aligned; thin on guardrails and output templates; runtime coherence partial — skills match the tools that exist but no coverage of the missing engineer workflow |
| **Total** | **14.5** | |

---

## Observations

### What Claude built in one shot
Full UI with the strongest facilitator feature set: filtering by automation potential, flagging, export of flagged items, close session, and an explicit "copy engineer link" button. Engineer view has a clear activity submission form. MCP server covers only facilitator operations. Three AI skills focused on post-session analysis.

Data model: `automationPotential` (yes/maybe/no), `timeEstimate` (quick/medium/significant), `enjoyment` (yes/meh/no), `repetitiveness` (yes/sometimes/no).

### What it got right unprompted
- "Copy engineer link" button — explicit, shareable, correct
- Facilitator filtering by automation potential is the most feature-rich of all four experiments
- Export of flagged items — the only experiment to include this in the UI out of the box
- `get_automation_candidates` implements a sensible scoring algorithm (automationPotential + repetitiveness + enjoyment)
- `summarize_session` returns a breakdown across all four activity attribute dimensions

### What it missed or got wrong
- MCP missing `create_session` and `add_activity` — an agent cannot bootstrap or populate a session without falling back to the HTTP API
- No `close_session` MCP tool (though the UI has it)
- Skills only address the post-session facilitator phase; no skill for engineers to submit activities
- Activity management is add-only in the UI

### MCP surface specifically
Designed exclusively for facilitator workflows. The tools that exist are well-named and correctly modeled. But the missing engineer-side tools mean a real agent test requires API fallback. During testing, the LM successfully worked around this — but the gap is a design failure, not a runtime workaround.

### Skills surface specifically
`prioritize-automation` is the strongest — uses `get_automation_candidates` correctly and asks for a ranked table output. `draft-backlog` is functional but underspecified on output format compared to Exp 03/04. `summarize-session` lacks a concrete output template.

Runtime coherence: **3/5** — facilitator skills match existing tools correctly; engineer workflow has no skill coverage because the MCP tools don't exist.

### Iteration breakdown
- UI: Strong as-is; activity CRUD is add-only
- MCP: Needs create_session, add_activity, close_session
- Skills: Needs engineer-side skill once add_activity exists in MCP

---

## Key Takeaway

PM user stories produced the strongest UI facilitator toolset but didn't prompt agent surface thinking — the MCP was designed only for post-session analysis, leaving session creation and activity submission entirely inaccessible to an agent.
