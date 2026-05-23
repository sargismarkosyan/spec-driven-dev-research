# Findings: Experiment 01 — Problem Statement

> Scoring criteria: see `shared/evaluation-rubric.md`
> This is the **first-pass** record (iteration 0). Iterations log will be updated during the improvement phase.

---

## Iterations Log

| # | Prompt | What was missing / wrong | What it fixed |
|---|---|---|---|
| 1 | _(initial prompt — v1 spec)_ | — | Initial generation (v1) |
| 2 | _(initial prompt — v2 spec)_ | — | Fresh generation from updated problem statement |

**Total prompts to reach final state:** TBD — tracked during iteration phase

---

## Second Pass Results (v2 Spec)

**MCP:** Still missing `add_activity` — same core gap as v1. Had to fall back to direct API calls to populate the session. Able to summarize and surface the facilitator view. The updated problem statement improved the problem framing and added the team-decision rationale for automatability, but it still names no tools — so Claude didn't invent the engineer-side MCP surface.

**UI:** Simple but solid. Invite link present and working. Session start control correctly gated — activity creation blocked before session starts. No activity recommendation/prompt rail. **Automatable flagging worked best here of all four experiments** — the core prioritization feature was most reliable in the simplest implementation while the more-detailed experiments' versions failed or partially broke. Export Markdown worked end-to-end.

**Key paradox:** Less spec produced more reliable core-feature execution. When Claude has to invent the solution, it focuses on the one thing the problem describes — identifying automatable work. When given a larger spec, attention spreads across 30+ features and the core logic becomes less reliable.

### v2 Score Adjustments
| Dimension | v1 Score | v2 Score | Change | Notes |
|---|---|---|---|---|
| Completeness | 3 | 3 | → | Still missing prompt rail, matrix, discussion mode; invite link now present |
| Code Correctness | 4 | 4 | → | Core flows reliable; automatable flagging now confirmed working |
| Architecture & Design | 3 | 3 | → | Data model still self-invented; problem framing improved |
| MCP Quality | 4 | 3 | ↓ | add_activity still absent; v1 actually had more tools overall |
| Skills Quality | 4 | 3.5 | ↓ | Fewer skills than other experiments; present but thin |
| **Total** | **18** | **16.5** | ↓ | |

---

## Scores

| Dimension | Score (1–5) | Notes |
|---|---|---|
| Completeness | 3 | All four surfaces present; link sharing gives session ID not a shareable URL (critical friction); activities are add-only (no edit/delete) |
| Code Correctness | 4 | All UI flows functional; MCP covers full workflow; facilitator view requires a console command to set localStorage — works but adds friction |
| Architecture & Design | 3 | Chose a pain-centric data model (painLevel 1–5, frequency, minutesPerOccurrence) — valid but diverges from the automation-potential model the other three experiments converged on; link via ID rather than URL shows limited product thinking |
| MCP Quality | 4 | Full workflow coverage: create_session, add_activity, list_activities, flag_activity, close_session all present; list_activities supports sort by painLevel and minutesPerOccurrence — domain-appropriate; facilitator view access requires localStorage workaround |
| Skills Quality | 4 | Only 2 skills vs. 3 elsewhere, but highest human-workflow quality: log-toil has strong elicitation design (pain level guidance, don't-invent guardrails); facilitate-review includes real facilitation logic and flag/close flow; runtime coherence is perfect — every tool name and field referenced in skills exists in mcp.ts |
| **Total** | **18** | |

---

## Observations

### What Claude built in one shot
Full four-surface application: Next.js UI with session creation, engineer activity submission form, and facilitator review panel with close-session capability. Express API with in-memory store. MCP server with 6 domain tools. Two AI skills covering both engineer and facilitator workflows.

Chose a distinct data model: activities described by `painLevel` (1–5), `frequency` (daily/weekly/monthly/occasional), `minutesPerOccurrence`, and `category` — a pain-and-time-cost framing rather than the automation-potential framing the other experiments used.

### What it got right unprompted
- MCP tool set covers the complete workflow end to end (both engineer and facilitator)
- `list_activities` includes sort-by-painLevel, which is exactly the kind of prioritization a facilitator needs
- Skills correctly reference the exact tool names and field names from the implementation — perfect internal coherence
- `facilitate-review` skill includes a real output template and a flag→close flow

### What it missed or got wrong
- Link sharing: provides the session ID but not a clickable URL — the engineer has to construct the URL themselves
- Activity management is add-only; no edit or delete
- Facilitator view requires manually running a console command to set localStorage before the view works — a leaky implementation detail

### MCP surface specifically
Strongest runtime result among the four experiments. All six tools work as expected during real agent testing. The only issue was that the agent had to ask the user to set localStorage values to access the facilitator view — the MCP correctly returned the session ID and link but the frontend gating wasn't agent-accessible.

### Skills surface specifically
`log-toil` and `facilitate-review` are the best human-workflow skills across all four experiments. They read as real facilitation scripts, not just tool-call wrappers. Pain level guidance ("1–2 = tolerable, 3 = frustrating, 4–5 = significant") is a nice touch. The downside: only two skills — no summarize or backlog-generation skill.

Runtime coherence: **5/5** — perfect alignment between skill instructions and mcp.ts implementation.

### Iteration breakdown
- UI: Link sharing and localStorage workaround need fixes
- MCP: Solid, minor facilitator-link access issue
- Skills: Good as-is, could add a summarize/backlog skill

---

## Key Takeaway

A 2–3 sentence problem statement produced the most internally coherent agent surface of all four experiments — perfect skill-MCP alignment — but invented its own pain-centric data model and missed the shareable-link UX detail that makes the app actually usable in a real session.
