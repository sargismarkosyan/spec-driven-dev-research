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
