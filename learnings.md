# Running Learnings

Synthesis across experiments — updated after each one completes.

---

## After Experiment 01 — Problem Statement

A minimal problem statement (2–3 sentences) was enough to produce a working four-surface application. Claude invented everything it wasn't told: the data model (pain-centric with `painLevel`, `frequency`, `minutesPerOccurrence`), the MCP tool set (complete, covering both engineer and facilitator workflows), and two AI skills with strong human-workflow scaffolding.

The output was internally consistent — skills referenced the exact tools in `mcp.ts`, with matching field names. But the conceptual model diverged from what the other specs produced: a pain-and-time-cost framing rather than an automation-potential framing.

**What this means:** A problem statement gives Claude maximum creative latitude and it uses it — but the result is a valid interpretation, not necessarily the intended one. The biggest risk is data model drift: without specifying fields, you get a model Claude considers reasonable, which may not match your actual domain vocabulary.

## After Experiment 02 — PM Requirements

PM user stories (user stories + acceptance criteria) translated accurately into UI features. The facilitator experience was the strongest of all four experiments — filtering, flagging, export of flagged items — because those were explicitly described in the stories. But user stories describe what users do, not what an agent needs to do it for them. Result: the MCP was designed only for post-session facilitator analysis; session creation and activity submission were entirely absent from the agent surface.

**What this means:** PM specs are well-suited for UI generation but actively poor at prompting agent surface design. The spec's vocabulary ("as a facilitator, I can filter...") maps to UI components, not to MCP tools. If you need a complete agent surface, PM requirements alone are insufficient.

## After Experiment 03 — User Role Based Action

A user-role-based spec (who the users are, their goals, the workflow approach) produced the sharpest product thinking: the best onboarding flow (session → share-link page), the only working reviewing mode, and the most precise skill-MCP alignment (scoring weights in skills matched the server implementation exactly). But like Exp 02, it left the engineer workflow off the agent surface entirely.

The skills were the best-crafted of all four: explicit scoring tables, guardrails ("ask before mutating"), detailed step-by-step instructions, and concrete output templates. However, the MCP was the weakest — no `create_session`, no `add_activity`.

**What this means:** A user-role spec is the most effective for UI and skills quality, because it forces thinking about what each role needs to accomplish. But it produces the same blind spot as PM requirements for agent surfaces: it describes human goals, not machine operations. The irony is that the spec most focused on users produced the tool set least usable by an agent.

## After Experiment 04 — Technical Requirements

A full technical PRD (data model, tech stack, epics, component structure) produced the most complete agent surface: 8 MCP tools covering the full workflow, facilitatorToken-based access control, real-time Socket.io events on mutations, and the only experiment where agent testing worked end-to-end without workarounds. The skills were the most production-ready (PM tool formats, acceptance criteria templates).

But the prescriptive detail came at a cost: the UI's most critical user moment (sharing the session link) was missing, and the reviewing mode was implemented but broken. Over-specification in one area (technical architecture) crowded out product-moment thinking.

**What this means:** A technical PRD is the most reliable spec type for agent surface completeness, because it forces you to describe operations and data structures — which map directly to MCP tools and skill inputs. But it trades product thinking for technical correctness. The application works for machines before it works for humans.

---

## Emerging Patterns

### 1. Spec type predicts agent surface quality more than UI quality
UI experience was similar across all four experiments — users struggled to identify significant differences between facilitator views. MCP quality swung from 1 (Exp 03) to 5 (Exp 04). The spec's conceptual framing determines how Claude thinks about the agent surface, not the user surface.

### 2. Every spec type produced a different data model
- Exp 01: `painLevel`, `frequency`, `minutesPerOccurrence` (pain-centric)
- Exp 02: `automationPotential`, `timeEstimate`, `enjoyment`, `repetitiveness`
- Exp 03: `automatable`, `repetitive`, `duration`
- Exp 04: `automatable`, `timeEstimate`, `enjoyment`, `repetitive`

No two experiments produced identical field names. The spec's vocabulary propagated into the data schema. If you need a specific domain model, you must specify it explicitly.

### 3. The engineer workflow is the hardest surface to get right
Experiments 02 and 03 both omitted engineer-side MCP tools (`create_session`, `add_activity`). Only Exp 01 (problem statement) and Exp 04 (technical PRD) produced a complete MCP. The engineer workflow is invisible in specs that focus on user goals or feature requirements — it only appears when you think about operations.

### 4. Internal coherence varies by spec type
- Exp 01 and 04: High internal coherence (skills ↔ MCP alignment)
- Exp 02 and 03: Skills coherent with the tools that exist, but the tool set is incomplete

The more prescriptive the spec, the more coherent the output — but coherence within an incomplete system is not the same as completeness.

### 5. Spec type shapes the "product moment" thinking
- Exp 03 (user-role) produced the best product moment: session → share-link flow
- Exp 04 (technical) missed the share-link entirely — it was never in the spec as a moment, only as a data field
- This suggests that product-moment thinking requires either a UX-focused spec section or explicit user journey descriptions

---

## Hypotheses Going In vs. What We Found

| Hypothesis | Result |
|---|---|
| More spec = better output | Partially true — more spec produces better agent surfaces (MCP, Skills) but not necessarily better UI |
| Problem statement alone is insufficient | Partially false — Exp 01 produced a more complete MCP than Exp 02 and Exp 03; the problem statement prompted agent thinking that PM stories did not |
| User role spec beats PM requirements | Partially true for UI and skills quality; false for MCP completeness — both Exp 02 and 03 missed engineer-side MCP tools |

---

## After v2 Specs — New Findings

### 6. Naming operations in acceptance criteria is the MCP unlock

Exp 02 went from MCP score 2 (v1) to MCP score 4 (v2). The only meaningful change to the spec was adding one acceptance criterion: *"The application exposes an MCP server so an AI assistant can create sessions, join as a participant, add activities, classify activities, flag items…"* — a single sentence naming the operations.

The spec didn't need to be technical. It didn't need signatures, types, or return values. It just needed to enumerate the verbs. This is the minimum viable spec change to unlock a complete agent surface from a PM-style document.

### 7. Behavioral specs have a hard ceiling for MCP quality

Exp 03 received approximately 3× more content in v2 — the facilitator curation role, discussion mode with keyboard shortcuts, merge dialog similarity scoring, all 9 prompt categories, QR code in lobby. MCP score: still 1. Read-only. No `create_session`, no `add_activity`.

This is not a content problem — it is a framing problem. A spec that describes *what users do* will always produce a UI-first implementation. The agent surface requires describing *what operations the system exposes*, regardless of how detailed the behavioral description becomes.

**Implication:** If your spec format is behavioral (user stories, role descriptions, journey maps), add a dedicated "agent surface" section that explicitly names MCP tools. Without it, no amount of detail will produce a complete MCP.

### 8. The simplicity paradox — core feature reliability

Exp 01 (problem statement) had the most reliable core feature in v2: the automatable flagging mechanism worked correctly while all three more-detailed experiments' versions failed or partially broke. 

When Claude has less spec to work with, it focuses on the one thing the problem describes. When given a larger spec, attention spreads across 30+ features and the simplest implementation of each gets fragmented. **For a single critical feature, a focused problem statement can outperform a comprehensive technical spec.**

### 9. Spec corrections propagate precisely into generated code

Exp 04 v1 had a wrong quadrant label (`celebrate` instead of `STRATEGIC`). The v2 spec corrected it. The v2 output had the correct label. The spec is not just documentation — it is compiled. Errors in the spec produce errors in the code; corrections in the spec produce corrections in the code. This applies to field names, option values, formula constants, and UI copy equally.

---

## The Exp 05 Plan — Closing the Loop

The study concludes with a codebase-first approach: build the ideal implementation from the Claude Design mocks (iterating until it matches the hi-fi prototype), then extract a comprehensive spec from the working codebase. That extracted spec — written by AI from working code rather than by a human before it exists — is then adapted into all four spec formats and used for one final round.

**The central question of the final round:** If all four spec formats describe identical feature content (derived from a real implementation), does spec *format* still affect output quality?

If yes — format matters independently of content. If no — the earlier differences were content gaps, not format effects. Either answer is a clean finding.
