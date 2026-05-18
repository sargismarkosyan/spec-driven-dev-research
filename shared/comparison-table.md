# Cross-Experiment Comparison

First-pass scores — recorded before the iteration phase. Iteration counts (prompts to final state) will be filled in after each experiment reaches its ideal state.

---

## Scores

| Dimension | 01 Problem Statement | 02 PM Requirements | 03 User Role Based | 04 Technical |
|---|---|---|---|---|
| Completeness | 3 | 3 | 3 | 3 |
| Code Correctness | 4 | 3 | 3 | 3 |
| Architecture & Design | 3 | 3 | 4 | 3 |
| MCP Quality | 4 | 2 | 1 | 5 |
| Skills Quality | 4.0 | 3.5 | 4.5 | 4.5 |
| **Total** | **18** | **14.5** | **15.5** | **18.5** |
| **Prompts to final state** | TBD | TBD | TBD | TBD |

> Skills Quality uses Cursor's per-skill average (more granular than the rubric's 1–5 integer scale).

---

## What Each Spec Got Right Unprompted

| Surface | 01 Problem Statement | 02 PM Requirements | 03 User Role Based | 04 Technical |
|---|---|---|---|---|
| UI — correct layout | Functional; no standout moment | Explicit "copy engineer link" button | Session → share-link screen is the best onboarding flow | Full CRUD on activities |
| UI — correct flows | Add-only; close session | Filtering, flagging, export, close session | Flagging; working reviewing mode | Edit and delete activities |
| API — sensible endpoints | Yes; pain-centric data model | Yes; automation-potential model | Yes; automation-potential model | Yes; most complete (join, update, export) |
| API — correct data model | Different model (painLevel, frequency) | automationPotential, timeEstimate, enjoyment, repetitiveness | automatable, repetitive, duration | automatable, timeEstimate, enjoyment, repetitive (closest to spec) |
| MCP — right tool names | Yes; all tools correctly named | Partial (facilitator only) | Partial (facilitator only) | Yes; most complete and correctly named |
| MCP — right granularity | Good; 6 focused tools | Underspecified; 4 tools, missing 2 critical | Underspecified; no create/add tools | Best; 8 tools at the right granularity |
| Skills — correct workflows | Engineer + facilitator workflows | Facilitator only | Facilitator only (with guardrails) | Facilitator only (but most structured) |
| Skills — domain vocabulary | Pain-centric (painLevel, frequency) | Automation-potential-centric | Automation-potential-centric; exact score match to server | Automation-potential-centric + PM tool formats |

---

## What Each Spec Consistently Missed

| Gap | 01 | 02 | 03 | 04 |
|---|---|---|---|---|
| Shareable engineer URL | ✗ (gave session ID only) | ✓ | ✓ | ✗ (no link sharing at all) |
| Activity edit/delete | ✗ | ✗ | ✗ | ✓ |
| MCP: create_session | ✓ | ✗ | ✗ | ✓ |
| MCP: add_activity | ✓ | ✗ | ✗ | ✓ |
| MCP: engineer workflow | ✓ | ✗ | ✗ | ✓ |
| Working reviewing mode | — | — | ✓ | ✗ |

**Cross-cutting gap:** Experiments 02 and 03 both failed to include engineer-side MCP tools (create_session, add_activity). This is the single largest functional gap: without these, an agent cannot run a session end-to-end.

**Data model divergence:** Exp 01 invented a pain-centric model (painLevel, frequency, minutesPerOccurrence). Exp 02–04 all used automation-potential-centric fields, but with slightly different names (automationPotential vs. automatable vs. automatable; repetitiveness vs. repetitive). No two experiments used an identical data model.

---

## Iteration Cost by Surface

| Surface | 01 | 02 | 03 | 04 |
|---|---|---|---|---|
| App (UI + API) | TBD | TBD | TBD | TBD |
| MCP server | TBD | TBD | TBD | TBD |
| Skills | TBD | TBD | TBD | TBD |

_Tracked during the iteration phase. 0 = first shot was correct._

---

## Key Observation Per Experiment

| Experiment | One-sentence takeaway |
|---|---|
| 01 Problem Statement | A 2–3 sentence spec produced the most internally coherent agent surface (perfect skill-MCP alignment) but invented its own data model and missed the shareable-link UX. |
| 02 PM Requirements | User stories translated well into UI facilitator features but didn't prompt agent surface thinking — MCP covered only post-session analysis, not session creation or activity submission. |
| 03 User Role Based | Best product UX thinking (onboarding flow, working reviewing mode) and the most precise skill-MCP score alignment, but the engineer workflow was entirely absent from the agent surface. |
| 04 Technical Requirements | Only experiment where MCP testing worked perfectly on the first try; the most complete agent surface, but the UI's most critical moment (sharing the session link) was missing. |

---

## Emerging Finding: Spec Type Predicts Agent Surface More Than UI

Across all four experiments, the UI experience was surprisingly similar — users struggled to identify meaningful differences between facilitator views. But MCP quality swung from 1 to 5 entirely based on spec type. The clearest predictor of a complete agent surface was whether the spec described the system's operations (technical PRD) rather than user goals (role-based or PM requirements).

The second finding: different spec types produced different data models. No two experiments used identical field names, and Exp 01's model was conceptually different from the others. The spec's conceptual framing propagated all the way into the data schema.
