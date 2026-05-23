# Findings: Experiment 03 — User Role Based Action

> Scoring criteria: see `shared/evaluation-rubric.md`
> This is the **first-pass** record (iteration 0). Iterations log will be updated during the improvement phase.

---

## Iterations Log

| # | Prompt | What was missing / wrong | What it fixed |
|---|---|---|---|
| 1 | _(initial prompt — v1 spec)_ | — | Initial generation (v1) |
| 2 | _(initial prompt — v2 spec)_ | — | Fresh generation from updated user-role spec |

**Total prompts to reach final state:** TBD — tracked during iteration phase

---

## Second Pass Results (v2 Spec)

**MCP:** Still read-only. Same structural gap as v1 despite significant improvements to the spec — new sections on the facilitator's curation role, explicit discussion mode flow, keyboard shortcuts, merge dialog behavior. None of this translated to MCP tools. **This is the sharpest finding in the study:** a behavioral spec, no matter how detailed, doesn't trigger agent surface design because it describes what humans do, not what tools an agent needs. The v2 spec has ~3x more content than v1 but the MCP result is identical. Only 5 tools, lowest count of all experiments.

**UI:** Similar to Exp 02 but slightly better — "definitely better visuals, more controls." More visually appealing. The v2 spec's explicit description of facilitator curation, the discussion flow, and the three-column board layout translated well into UI. Close to Exp 02 in quality, just a notch better overall.

**Key finding:** Spec improvement plateau for MCP. Adding more behavioral detail to a role-based spec yields better UI but zero improvement on the agent surface. To unlock MCP quality, the spec type needs to change — not just grow.

### v2 Score Adjustments
| Dimension | v1 Score | v2 Score | Change | Notes |
|---|---|---|---|---|
| Completeness | 3 | 3.5 | ↑ | Better UI features; MCP still structurally incomplete |
| Code Correctness | 3 | 3.5 | ↑ | Better visual quality; more controls present |
| Architecture & Design | 4 | 4 | → | Still strong product thinking; slightly better layout |
| MCP Quality | 1 | 1 | → | No change — still read-only; behavioral spec doesn't generate tool lists |
| Skills Quality | 4.5 | 4 | ↓ | Lowest skill count (5) of all v2 experiments |
| **Total** | **15.5** | **16** | ↑ | |

---

## Scores

| Dimension | Score (1–5) | Notes |
|---|---|---|
| Completeness | 3 | Best UI onboarding flow; facilitator reviewing mode works; MCP severely incomplete — missing create_session and add_activity — engineer workflow inaccessible via agent |
| Code Correctness | 3 | Runs; UI reviewing mode works (only experiment where this does); MCP near-unusable for the full workflow |
| Architecture & Design | 4 | Best product thinking unprompted: session creation immediately transitions to a "share link with engineers" screen; skills scoring model exactly matches the server's automationScore() implementation — highest internal design coherence of all four |
| MCP Quality | 1 | Missing create_session and add_activity; only read/analyze/flag tools present; agent cannot bootstrap or populate a session at all |
| Skills Quality | 4.5 | Best-crafted facilitator skill set: explicit scoring tables, "ask before mutating" guardrails, detailed step numbering, concrete output templates; runtime coherence partial but precise — scoring weights in skills match mcp.ts code exactly |
| **Total** | **15.5** | |

---

## Observations

### What Claude built in one shot
Full UI with the best onboarding flow: after session creation, the app immediately navigates to a screen prompting the facilitator to share the link with engineers — the only experiment to make this the natural next step. Engineer activity form is present. Facilitator view includes a flagging mechanism and a working "switch to reviewing" mode. Notably, the layout is different from the other three: a non-vertical-column structure.

Data model: `automatable` (yes/maybe/no), `repetitive` (yes/sometimes/no), `duration` (quick/medium/significant), `priority` (high/medium/low).

MCP: only read, filter, flag, set_priority, and generate_summary tools. No session creation or activity submission.

### What it got right unprompted
- Session → "share link" flow: the most product-thoughtful UX moment across all four experiments
- Reviewing mode in the UI works correctly (Exp 04 has this feature but it's broken)
- `generate_summary` returns a preformatted plain-text output — ready to paste or share
- Skills' scoring model (`automatable=yes +3`, `repetitive=yes +2`, `duration=significant +2`) matches the server's `automationScore()` function exactly — perfect specification coherence
- `set_priority` and `flag_activity` tools have correct signatures; `prioritize-automation` skill correctly confirms before calling `set_priority`

### What it missed or got wrong
- MCP: no `create_session` — an agent cannot start a session
- MCP: no `add_activity` (or equivalent) — an agent cannot add activities
- Data was harder to access during agent testing compared to other experiments
- Skills cover only facilitator workflows; no engineer-side skill

### MCP surface specifically
The weakest MCP of the four. The tools that exist are well-implemented — the scoring logic is the most precise of any experiment — but the complete absence of session creation and activity submission tools means the tool set cannot support an end-to-end agent workflow. The facilitator-only design likely reflects the spec's emphasis on what facilitators do, without triggering tool design for the engineer workflow.

### Skills surface specifically
Strongest facilitator skill set across all four experiments. "Ask before setting anything" is an excellent guardrail. The scoring table in the prioritization skill is explicit and verifiable. Output templates in summarize-session are the most complete. The draft-backlog skill includes a markdown/JSON fallback.

Runtime coherence: **3/5** — what exists aligns with mcp.ts precisely; the gap is that the MCP is structurally incomplete.

### Iteration breakdown
- UI: Strong; minor layout differences from expected; reviewing mode works
- MCP: Needs create_session and add_activity urgently — these are blocking for end-to-end agent testing
- Skills: Good facilitator coverage; needs engineer-side skill once MCP is complete

---

## Key Takeaway

A user-role spec produced the sharpest product thinking (best onboarding flow, working reviewing mode, exact scoring coherence between skills and server) but left the engineer workflow entirely off the agent surface — because the spec described *what users do*, not *what an agent needs to do it for them*.
