# Blog Post Outline — Two-Part Version

> The single-article version is in `blog-outline.md`. This is the split alternative.
> Part 1 covers the format/type question (Experiments 01–07).
> Part 2 covers the content question (Experiments 08–09) and delivers the practical framework.
> Each article stands alone. Part 1 ends with a natural tease into Part 2.

---

# Part 1: "Does It Matter How You Write Your Spec?"

**Title:** "We Built the Same App Four Ways. The Spec Format Made One Thing Different."
**Subtitle:** "Four experiments in spec-driven development — and the one surface where the format of your spec actually matters."
**Target:** Medium / dev.to
**Audience:** Senior engineers and engineering leads already using AI coding tools who want to write better specs

---

## One-Sentence Thesis

The format of your spec predicts agent surface quality — but almost nothing else. What you write matters more than how you structure it.

---

## Structure

### 1. Hook (~200 words)

**Angle:** The spec format debate is the wrong debate.

The SDD space has strong opinions about format. Problem statements. User stories. PRDs. Role-based specs. Thoughtworks put SDD on the radar. GitHub shipped Spec Kit. AWS shipped Kiro. Every tool has a template. Every template implies a format is the answer.

But nobody had tested this systematically. Does format actually change what gets built? Or does the model just… figure it out either way?

We had the same question — and we ran the experiments. Same application, same model, same base project. Four different spec formats. And we measured not just whether it ran, but five distinct quality dimensions: UI, API, MCP server quality, AI skill quality, and runtime coherence.

Close with the thesis: the format changed one thing clearly, and almost nothing else as expected. Here's what we found.

---

### 2. What We Built and Why (~200 words)

**The application:** Toil Tracker — a real-time collaborative retrospective tool. Engineers log recurring work in a session; a facilitator reviews, flags automation targets, and exports results. Multi-user, distinct roles, real-time updates, facilitation workflow.

**Why this app specifically:** Small enough to build in one session, complex enough to have real design decisions. Not a todo app — LLMs have memorized thousands of todo implementations. We wanted the model to rely on our spec, not its training data.

**The four spec formats:**

| # | Format | What it contains |
|---|---|---|
| 01 | Problem statement | 2–3 sentences describing the problem |
| 02 | PM requirements | User stories + acceptance criteria |
| 03 | User role based | Who the users are, their goals, the workflow |
| 04 | Technical PRD | Full data model, tech stack, epics, component structure |

**What we measured:** Completeness, Code Correctness, Architecture & Design, MCP Quality, Skills Quality — scored 1–5 each. Plus a real agent test: create a session, add activities, navigate the facilitator view.

---

### 3. The Four Experiments (~600 words)

Walk through each experiment with findings compressed to the essential pattern. Don't over-explain — let the contrast do the work.

**Experiment 01 — Problem Statement (Score: 18/25)**

What Claude built: a full four-surface application. The data model it invented: activities described by `painLevel`, `frequency`, `minutesPerOccurrence`. A pain-and-time-cost framing — valid, but unlike what any other experiment produced.

What it got right unprompted: the most internally coherent agent surface of all four. Every tool name the skills referenced existed in the actual MCP server. The skills wrote real facilitation scripts, not just tool lists.

What it missed: shareable link (engineers got a session ID, not a URL). localStorage leak in the facilitator view.

Agent test: passed. With a workaround.

**Experiment 02 — PM Requirements (Score: 14.5/25)**

What Claude built: the strongest facilitator UI — explicit "copy engineer link" button, export of flagged items. The MCP server, however, covered only post-session analysis: `get_session`, `list_activities`, `summarize_session`, `get_automation_candidates`. No `create_session`. No `add_activity`.

Why: PM user stories are written from a user's perspective in the app. They don't naturally produce operations for bootstrapping the workflow — because users don't think about creating sessions, they just do it.

Agent test: failed. The agent had to fall back to direct HTTP calls.

**Experiment 03 — User Role Based (Score: 15.5/25)**

What Claude built: the sharpest onboarding UX — the only experiment where session creation immediately navigated to a share-link screen. The skills had the most precise scoring model (`automatable=yes +3`, `repetitive=yes +2`, `duration=significant +2`), which matched the server's implementation exactly. The model inferred the same weighting logic from the role description.

Same gap as Experiment 02: no `create_session`, no `add_activity` in the MCP. Role specs describe what users accomplish, not what an agent needs to bootstrap it.

Agent test: failed for the engineer workflow.

**Experiment 04 — Technical PRD (Score: 18.5/25)**

What Claude built: the most technically complete application. Full CRUD on activities — the only experiment with edit and delete. Eight MCP tools covering the complete workflow. FacilitatorToken-based access control. Real-time Socket.io events on all mutations.

What it missed: no shareable link in the UI. The one moment that makes the app feel designed — gone.

Agent test: perfect. First try, no workarounds.

---

### 4. The Finding: Format Predicts One Surface (~300 words)

**The scores:**

| Dimension | 01 Problem Statement | 02 PM Requirements | 03 User Role Based | 04 Technical PRD |
|---|---|---|---|---|
| Completeness | 3 | 3 | 3 | 3 |
| Code Correctness | 4 | 3 | 3 | 3 |
| Architecture & Design | 3 | 3 | 4 | 3 |
| MCP Quality | 4 | 2 | 1 | 5 |
| Skills Quality | 4.0 | 3.5 | 4.5 | 4.5 |
| **Total** | **18** | **14.5** | **15.5** | **18.5** |

MCP quality swung from 1 to 5 based entirely on spec format. Everything else was surprisingly similar.

**Why MCP quality tracks format so cleanly:** The spec's framing determines how Claude thinks about what the system *does*. A problem statement leaves it free to think about operations — it designs an MCP that covers the workflow end to end. PM stories frame everything as user actions, which maps to UI components, not tool calls. A technical PRD with a data model and epics maps directly to MCP tools because it's already describing what the system does rather than what users feel.

**The counterintuitive result:** The problem statement produced a more complete MCP than Experiments 02 and 03 — because without constraints, Claude thought about operations rather than screens. The risk wasn't quality, it was unpredictability: different data model, different product decisions, nothing you explicitly chose.

**The practical split:** If you're building for agents to use, a technical PRD is the most reliable format. If you care most about sharp product flows and onboarding, a user-role spec produces the best thinking there.

---

### 5. What Format Can't Fix (~250 words)

Every experiment needed follow-up work. None reached an ideal state in one shot. More interesting: even after choosing the "best" format, all four produced different data models.

| Experiment | Key activity fields |
|---|---|
| 01 Problem Statement | `painLevel`, `frequency`, `minutesPerOccurrence` |
| 02 PM Requirements | `automationPotential`, `timeEstimate`, `enjoyment`, `repetitiveness` |
| 03 User Role Based | `automatable`, `repetitive`, `duration` |
| 04 Technical PRD | `automatable`, `timeEstimate`, `enjoyment`, `repetitive` |

No two experiments used identical field names. The spec's conceptual framing propagated into the schema. If your data model matters — for integration, for team consistency, for external consumers — format is not enough. You have to name the fields explicitly.

This realization led to a different question. We'd been asking "which format is best?" We should have been asking "which parts of the spec content actually drive correctness?"

**Transition to Part 2:** We built a reference application — the exact version we wanted — and generated its full spec: 83,000 tokens covering every screen, every field, every socket event. Then we ran two more experiments: rebuild from that spec, measure what deviated. Even at 83K tokens, variance persisted. The problem wasn't quantity. It was content. Part 2 covers what we found when we stopped asking about format and started asking about categories.

---

### 6. Closing (~150 words)

The spec format question has a clean answer: format matters for the agent surface (MCP and skills), and not much anywhere else. A technical PRD produces the most reliable MCP. A user-role spec produces the sharpest product thinking. A problem statement produces surprising internal coherence but unpredictable product decisions.

For UI quality, all four formats landed within striking distance of each other. The model builds what makes sense given the problem — format shapes the frame, not the craft.

If you're building an AI-native application where agent access is a first-class feature, lean toward the technical PRD. If you're iterating on an existing product, the format matters less than you'd expect — because the codebase is already doing most of the specification work.

That's the subject of Part 2.

---

## Tone Notes

- Empirical, not prescriptive. Let the scores speak.
- The counterintuitive finding (problem statement beating PM requirements on MCP quality) is the story — lead into it, don't bury it.
- End on genuine curiosity, not a conclusion. Part 1 raises the question Part 2 answers.

## Visuals

- Scores table (the comparison grid)
- Data model divergence table (four sets of field names)
- MCP quality bar chart — 1, 2, 1, 5 is visually striking

---
---

# Part 2: "Your Spec Needs Two Things. The Rest Your Codebase Already Knows."

**Title:** "Your Spec Needs Two Things. The Rest Your Codebase Already Knows."
**Subtitle:** "Five experiments in spec-driven development — what the ablation and additive studies taught us about the minimum viable spec."
**Target:** Medium / dev.to
**Audience:** Senior engineers and engineering leads already using AI coding tools who want to write better specs

> *This is Part 2 of a two-part series. Part 1 covers how spec format affects output quality across four spec types.*

---

## One-Sentence Thesis

The minimum viable spec for an existing codebase is business rules and UI guidance — everything else the LLM infers from your code.

---

## Structure

### 1. Hook (~200 words)

**Angle:** Everyone is telling you to write a detailed spec. Nobody is telling you which parts matter.

In Part 1, we found that spec format predicts agent surface quality but not much else. That left the deeper question open: when you're iterating on an existing codebase, what actually needs to be in the spec? The codebase already encodes naming conventions, component patterns, socket structure. The model reads it and conforms. So what's left for the spec to do?

We had a reference application — exactly the product we wanted. We generated its full spec: 83,000 tokens. Then we ran it through a series of controlled experiments: remove one spec category at a time, then add one back at a time. Ten implementations of the same feature across two experiments.

The answer was sharper than we expected.

Close with thesis stated plainly.

---

### 2. The Setup (~250 words)

**Why integration, not greenfield:** Greenfield experiments (same app, four formats) produced high variance — too many uncontrolled variables. When there's no existing codebase, the LLM makes every structural decision itself. We wanted to isolate what the spec contributes on top of an existing, well-structured codebase.

**The reference application:** Built using Claude Design, iterated visually until it was exactly what we wanted. This produced a codebase *and* an implicit design language — naming conventions, component library, socket patterns, TypeScript idioms. Everything encoded.

**The feature:** A merge feature — allows the facilitator to combine similar activities submitted by different engineers into one consolidated card. It had specific business logic (Jaccard similarity formula with exact weights: 0.85 title / 0.10 frequency / 0.05 time-per-occurrence), cross-cutting visibility rules (merged sources hidden from facilitator views, preserved in engineer boards and export), and a non-trivial modal UI.

**The spec categories we tested:**
- Business rules (formulas, thresholds, visibility rules, side effects)
- UI guidance (modal layout, badge colors, button placement, copy)
- Data layer (field names, types, ID format)
- Technical interfaces (socket event names, REST paths)

---

### 3. The Ablation Study — What Breaks When You Remove It (Experiment 08) (~500 words)

**The setup:** Full spec, minus one category per run. Five parallel implementations.

| Category removed | Unique bugs introduced |
|---|---|
| None (baseline) | 0 |
| Business rules | 4 |
| UI guidance | 0 (visual divergence only) |
| Data layer | 0 (field names invented, behavior correct) |
| Technical interfaces | 0 (inferred from codebase patterns) |

**The finding:** Business rules are categorically different from everything else.

Walk through the four bugs from removing business rules:
1. Similarity formula invented — weighted differently, different algorithm
2. Visibility filtering wrong — merged sources appeared in facilitator views
3. Merged result ID format different — no 8-char truncated UUID
4. Cross-view filtering inconsistent — some views hid sources, others didn't

None of these are guessable from codebase patterns. There's no convention for what a Jaccard formula should weight. There's no convention for which views should hide merged sources. These are domain decisions with specific correct answers that exist only in the spec.

**Removing UI guidance:** Visual divergence — badge colors slightly different, button order varied. No functional bugs. The LLM produced a reasonable merge modal; it just wasn't the one we designed.

**Removing data layer / technical interfaces:** Field names were invented (different names, same behavior). Socket event names differed. No functional bugs in either case — the codebase patterns were strong enough to guide correct implementation of the behavior. The naming just drifted.

**The split that emerges:**
- Codebase = source of truth for: how to structure code, naming conventions, component usage, technical patterns
- Spec = source of truth for: formulas with specific values, visibility and permission rules, cross-cutting side effects, anything where there's one correct answer that doesn't exist yet in the code

This is the direct counter to "spec as source of truth" maximalism. The codebase is *also* a source of truth — for a different class of information. The spec's job is to cover only what the codebase can't.

---

### 4. The Additive Study — Where Quality Crosses the Threshold (Experiment 09) (~500 words)

**The setup:** Flip it. Start with almost nothing; add one layer at a time. Five parallel implementations.

| Output | Spec provided |
|---|---|
| 9.1 | 2-sentence problem statement |
| 9.2 | + business rules |
| 9.3 | + UI guidance |
| 9.4 | + data layer |
| 9.5 | + technical interfaces (full spec) |

**9.1 (problem statement only):** A working merge feature. Respects the design system, uses existing components, follows socket patterns — because the codebase taught it all that. But incomplete: the merge modal let you edit only the title of the new card, not the time/frequency/energy fields. The agent didn't think of that without being asked.

**9.2 (+ business rules):** The largest quality jump. Correct Jaccard formula (0.85/0.10/0.05). Correct view filtering. Correct 8-character UUID. Correct teamAuto reset. Cross-view behavior all correct. Business rules alone crossed the functional correctness threshold. The gap between 9.1 and 9.2 was the widest of all five runs.

**9.3 (+ UI guidance):** Visual consistency locked in. Exact modal text, correct badge colors (rust above 0.6, amber above 0.3), correct two-column layout, correct button order. The outputs of 9.3 through 9.5 were nearly indistinguishable in user testing — same behavior, same visual result.

**9.4 and 9.5:** Precision improvements only. Exact field names in 9.4 — important for external consumers. Exact socket event names and REST paths in 9.5 — important if other systems depend on your API contracts. Neither changed the visible quality of the feature from a user's perspective.

**The inversion:** 9.2 produced the richest expanded source card view — showing full card details for each merged source. 9.3 and 9.4, constrained by the data model spec's explicit field names, showed only what those fields carried. More spec narrowed the solution. The agent without data model constraints found a better display.

Spec should describe outcomes, not implementation details, unless the implementation detail is itself the requirement.

**The threshold:** Business rules + UI guidance. Below that: functional gaps. Above that: precision for interoperability, not correctness.

---

### 5. The Practical Framework (~300 words)

**The question to ask about every spec element:** *Does this have a specific correct answer that isn't already in my codebase?* If yes, write it. If no, the LLM will infer it.

**When to specify what:**

| Spec layer | Write it when… | You can skip it when… |
|---|---|---|
| Business rules | It has a formula, threshold, or visibility rule with one correct answer | Never — if there's a specific correct value, write it |
| UI guidance | Visual consistency matters across iterations or team members | You're building v1 and plan to iterate on the design |
| Data layer | Other systems or teams consume your data | The feature is internal and field names aren't a contract |
| Technical interfaces | External systems depend on your exact socket/REST names | It's an internal implementation detail |

**The two-phase workflow:**

Phase 1 — Bootstrap: Use a design tool (Claude Design, v0, Bolt) to generate a baseline application. Iterate visually until you have what you want. This produces a codebase *and* an implicit design language — the LLM's own choices become the convention.

Phase 2 — Iterate on features: Write business rules + UI guidance for each new feature. Let the codebase carry the technical patterns. Accept that one iteration pass may be needed and plan for it rather than trying to eliminate it through spec completeness.

---

### 6. Rules of Thumb (~250 words)

A numbered list of portable, quotable rules. Each is one sentence of rule + one sentence of why.

1. **Write business rules. Always.** If a spec element has a formula, a threshold, a weight, or a visibility rule — write it. The LLM cannot infer specific correct values from codebase patterns.

2. **Your codebase is already a spec.** Naming conventions, component patterns, socket structure, design tokens — the LLM reads your code and conforms to it. Spec only needs to cover what isn't already there.

3. **Business rules + UI guidance = the minimum viable spec.** Below that, implementations diverge functionally. Above that, you're buying precision for external consumers, not functional correctness.

4. **More spec can narrow the solution space in bad ways.** Specify outcomes; leave the mechanism open unless the mechanism is the requirement. Constraining field names also constrains what can be displayed.

5. **A richer spec reduces variance — it does not eliminate it.** Even at 83K tokens, outputs deviated. Plan for one iteration pass. The spec's job is to make that pass fast, not to prevent it.

6. **Iteration is not failure.** You will not know what you want until you see it. The spec's job is to make the first version close enough that discoveries become refinements, not rebuilds.

---

### 7. Closing (~200 words)

Return to the opening tension: everyone says write a detailed spec. The evidence says write a *precise* spec — precise about the right things.

The "spec as source of truth" framing isn't wrong, but it's incomplete. The spec is the source of truth for business logic and UI decisions. The codebase is the source of truth for technical patterns. Both are authoritative; they cover different things.

The most durable insight from all nine experiments: spec-driven development is an iterative practice, not a one-shot generator. The value of a good spec isn't eliminating iteration — it's ensuring the important things are right in the first pass, so the iterations you do are on the right problems.

You will always need to see the running application to discover what you didn't know you wanted. The spec's job is to make the first version close enough that those discoveries are refinements, not rebuilds.

---

## Tone Notes

- Confident, not academic. We ran the experiments. We know what we found.
- Show the failures as data. The greenfield variance, the 9.5 LiveCard gap — these aren't embarrassments, they're the findings.
- Direct counter to "spec as source of truth" maximalism — position this explicitly, respectfully, with evidence.
- No hedging on the practical framework. Give the table. Let readers push back.

## Visuals

- Side-by-side merge modals from experiment 08 (5 outputs)
- 9.1 vs 9.3 modal comparison (no-spec vs minimum viable spec)
- The "when to specify what" decision table
- The spec layer quality matrix (layers × evaluation criteria)
