# Cross-Experiment Comparison

Two passes recorded. **v1** = first-pass with original specs. **v2** = fresh generation from updated specs (extracted from Claude Design mocks). Iteration counts will be filled in after each experiment reaches final state.

---

## Scores — v1 (Original Specs)

| Dimension | 01 Problem Statement | 02 PM Requirements | 03 User Role Based | 04 Technical |
|---|---|---|---|---|
| Completeness | 3 | 3 | 3 | 3 |
| Code Correctness | 4 | 3 | 3 | 3 |
| Architecture & Design | 3 | 3 | 4 | 3 |
| MCP Quality | 4 | 2 | 1 | 5 |
| Skills Quality | 4.0 | 3.5 | 4.5 | 4.5 |
| **Total** | **18** | **14.5** | **15.5** | **18.5** |

## Scores — v2 (Updated Specs from Design Mocks)

| Dimension | 01 Problem Statement | 02 PM Requirements | 03 User Role Based | 04 Technical |
|---|---|---|---|---|
| Completeness | 3 | 4 | 3.5 | 4 |
| Code Correctness | 4 | 3.5 | 3.5 | 4 |
| Architecture & Design | 3 | 3.5 | 4 | 4 |
| MCP Quality | 3 | 4 | 1 | 5 |
| Skills Quality | 3.5 | 3.5 | 4.0 | 4.5 |
| **Total** | **16.5** | **18.5** | **16** | **21.5** |
| **Δ vs v1** | −1.5 | **+4** | +0.5 | **+3** |

> Skills Quality uses Cursor's per-skill average (more granular than the rubric's 1–5 integer scale).

### What drove the v2 changes

| Experiment | Key driver |
|---|---|
| 01 | Slight MCP regression — problem statement still names no tools; v1 happened to include more by chance |
| 02 | **Biggest jump (+4):** adding explicit MCP/skills acceptance criteria ("an agent can create sessions, add activities…") was enough to flip MCP from 2→4 |
| 03 | Marginal UI improvement; MCP completely unchanged at 1 — behavioral spec plateau confirmed |
| 04 | Spec corrections propagated (right quadrant labels, correct data model, 9 prompt categories, discussion shortcuts) |

### The Exp 03 plateau finding
Spec 03 received ~3× more content in v2 — new sections on the facilitator curation role, discussion mode keyboard shortcuts, merge dialog behavior, all 9 prompt categories. MCP score: still 1. **A behavioral spec, no matter how detailed, does not generate tool lists.** Only naming operations explicitly unlocks agent surface quality.

---

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

| Surface | 01 | 02 | 03 | 04 | 05 (Design) |
|---|---|---|---|---|---|
| App (UI + API) | TBD | TBD | TBD | TBD | TBD |
| MCP server | TBD | TBD | TBD | TBD | TBD |
| Skills | TBD | TBD | TBD | TBD | TBD |
| **Total prompts** | TBD | TBD | TBD | TBD | TBD |

_Tracked during the iteration phase. 0 = first shot was correct._

---

## Experiment 05 — Claude Design Mocks

A fifth experiment is running in parallel: the application is built directly from the Claude Design hi-fi prototype (12 artboards), with no written spec as input. The design files serve as the source of truth.

**Purpose:** Establish the quality ceiling. The ideal implementation — as close to the design as possible — is reached through iteration. Once at ideal state, the codebase is used to extract a comprehensive spec. That extracted spec is then adapted into all four spec formats and used for the **final round** of all four experiments.

**Final round hypothesis:** If all four spec formats describe the same ideal feature set (derived from a real working codebase), does format still affect output quality? The final round answers this.

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
