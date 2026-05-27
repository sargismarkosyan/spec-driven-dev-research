# Your Spec Needs Two Things. The Rest Your Codebase Already Knows.

*Nine experiments in spec-driven development — what we learned about what to write, what to skip, and why your codebase is already doing most of the work.*

---

Everyone is telling you to write a spec.

Thoughtworks put spec-driven development on their radar. GitHub shipped Spec Kit. AWS shipped Kiro. The consensus is clear: write a detailed spec, treat it as the source of truth, generate code from it.

What's missing from all of it is experimental evidence. Which parts of a spec actually produce correct implementations? Which parts does the model figure out on its own? What's the minimum you can write and still ship something?

We had the same question. So we ran the experiments.

> **Whatever you put in the spec, the LLM follows. Everything else it infers from your codebase. The minimum viable spec is whatever you care about most — business rules are the floor.**

Here's how we got there.

---

## What We Built

The application: a **Toil Tracker** (*toil*: SRE term for repetitive, manual work that's ripe for automation) — a real-time collaborative retrospective tool where engineers log recurring work and a facilitator identifies automation targets. Multi-user, distinct roles, WebSocket-driven, with a full facilitation workflow.

We chose it deliberately. Complex enough to have real design decisions. Not a todo app — LLMs have memorized thousands of those. We needed the model to rely on our spec and our codebase, not its training data.

For the integration experiments, we focused on one feature: **merge**. The facilitator can combine similar activities submitted by different engineers into a single consolidated card.

This feature had everything needed for a meaningful test:

- **Specific business logic** — a Jaccard similarity formula with exact weights (85% title / 10% frequency / 5% time-per-occurrence), an 8-character UUID for the merged result, a `teamAuto` field that always resets to `unclassified`
- **Cross-cutting visibility rules** — merged source cards hidden from facilitator views, preserved in engineer boards and the export
- **Non-trivial UI** — a two-column modal, similarity badges keyed to score thresholds, avatar stacks showing contributing engineers
- **Five integration points** — the live view, matrix view, grouped view, discussion view, and export all needed to handle merged activities correctly

---

## How We Got to the Right Question

The research ran through three phases.

**Phase 1 — Greenfield (Experiments 01–04)**
Same app, four spec formats: a problem statement, PM user stories, a user-role description, a full technical PRD. The outputs diverged heavily. Different data models, different product decisions, different quality across surfaces. None produced something we'd ship in one pass.

**Phase 2 — Building a Reference (Experiment 05)**
We changed approach. Instead of spec-first, we built the application we actually wanted using Claude Design, iterating visually until it was right. Then we generated its full spec.

The result: **83,000 tokens** across multiple files — every screen, every data model field, every socket event, every rule.

**Phase 3 — Spec Completeness Test (Experiments 06–07)**
We used the 83K-token spec to rebuild the application twice, with two different models. Both produced strong results. Both still deviated in small but observable ways — a missing button, minor layout differences, edge cases handled differently.

The conclusion changed everything.

> You cannot close the gap through spec detail alone. At 83K tokens, variance still persists. The problem isn't spec *quantity*. It's spec *content*.

That sent us toward a sharper question: which categories of spec content actually drive correctness?

---

## The Ablation Study: What Breaks When You Remove It

We took the reference application, stripped out the merge feature, and rebuilt it five times — each run with the full spec minus one category.

| Category removed | Unique functional bugs |
|---|---|
| None (baseline) | 0 |
| **Business rules** | **4** |
| UI guidance | 0 |
| Data layer | 0 |
| Technical interfaces | 0 |

Business rules are categorically different from everything else.

Removing them produced four unique functional bugs:

1. The similarity formula was invented — different algorithm, different weights
2. Merged source cards appeared in facilitator views where they should be hidden
3. The merged result ID was formatted differently
4. Cross-view filtering was inconsistent across the live, matrix, and grouped views

Removing any other category? **Zero unique functional bugs.** Only visual divergence or naming drift.

**Why?** The codebase carries enormous implicit specification. Naming conventions, socket event patterns, component structure, TypeScript idioms, design tokens — the LLM reads the existing code and conforms to all of it. When you remove the data layer spec, it invents field names that follow your conventions. When you remove the technical interfaces spec, it invents socket event names that match your patterns. The behavior is correct. The names drift slightly.

But no amount of codebase reading tells the model that title similarity should be weighted at 85%, or that merged sources should be hidden from facilitator views but preserved on engineer boards. Those are domain decisions with specific correct answers that exist only in the spec.

> The codebase is *also* a source of truth — for a different class of information. The spec's job is to cover only what the codebase can't.

---

## The Additive Study: Where Quality Crosses the Threshold

We flipped the experiment. Start with almost nothing; add one spec layer at a time.

| Run | Spec provided | Result |
|---|---|---|
| 9.1 | 2-sentence problem statement | Working but incomplete |
| 9.2 | + business rules | **Functionally correct** |
| 9.3 | + UI guidance | Visually consistent |
| 9.4 | + data layer | Exact field names |
| 9.5 | + technical interfaces | Exact socket/REST names |

**9.1 — Problem statement only**
A working merge feature — respecting the design system, using existing components, following socket patterns. The codebase handled all of that. But the modal let you edit only the title. Time, frequency, and energy fields were missing. The agent didn't think of them without being asked.

**9.2 — Plus business rules** *(the largest jump)*
Correct Jaccard formula. Correct view filtering. Correct 8-character UUID. Correct `teamAuto` reset. Cross-view behavior correct across all views. The feature was ship-worthy. Business rules alone crossed the functional correctness threshold.

**9.3 — Plus UI guidance**
Visual consistency locked in — exact modal text, badge colors, two-column layout, button order. Outputs 9.3 through 9.5 were nearly indistinguishable in user testing.

**9.4 and 9.5 — Precision only**
Exact field names. Exact socket event names. Neither changed the visible quality of the feature — only its interoperability with external systems.

### The inversion

Here's what we didn't expect.

Output 9.2 — business rules only, no data model spec — produced the **richest** source card display. It showed full card details for each merged source: title, time estimate, frequency, energy, submitting engineer.

Outputs 9.3 and 9.4, constrained by the explicit field names in the data model spec (`mergedFromNames`, `mergedFromInitials`, `mergedFromColors`), showed only what those fields carried — names and avatars. Nothing more.

> More specification produced a narrower solution. The agent without data model constraints found a better display.

Spec should describe outcomes, not implementation details — unless the implementation detail is itself the requirement.

---

## The Practical Framework

One question to ask about every element before you write it:

> *Does this have a specific correct answer that isn't already in my codebase?*

If yes, write it. If no, the LLM will infer it.

### When to specify what

| Spec layer | Write it when… | Skip it when… |
|---|---|---|
| **Business rules** | It has a formula, threshold, or visibility rule | Never — if there's a correct value, write it |
| **UI guidance** | Visual consistency matters across iterations | You're on v1 and plan to iterate on the design |
| **Data layer** | Other systems consume your data | It's internal and field names aren't a contract |
| **Technical interfaces** | External systems depend on your API contracts | It's an internal implementation detail |

### The two-phase workflow

**Phase 1 — Bootstrap:** Use a design tool to generate a baseline application. Iterate visually until it's right. This produces a codebase *and* an implicit design language — the model's own choices become the convention every future iteration conforms to.

**Phase 2 — Iterate on features:** Write business rules + UI guidance. Let the codebase carry the technical patterns. Plan for one iteration pass rather than trying to eliminate it through spec completeness.

---

## Rules of Thumb

**1. Write business rules. Always.**
If a spec element has a formula, threshold, weight, or visibility rule — write it. The LLM cannot infer specific correct values from codebase patterns.

**2. Your codebase is already a spec.**
The LLM reads your code and conforms to it. Spec only needs to cover what isn't already there. The richer the codebase, the less you need to write per feature.

**3. Specify what you care about — business rules are the floor.**
Add UI guidance when visual consistency matters. Add precision specs when external systems need to interoperate. The LLM handles everything else.

**4. More spec can narrow the solution space in bad ways.**
Specify outcomes; leave the mechanism open unless the mechanism is the requirement. Constraining field names also constrains what can be displayed.

**5. Plan for one iteration pass — it will happen regardless.**
Even the 83K-token spec produced deviation. The spec's job is to make that pass fast by getting the important things right first.

---

## Closing

Everyone says write a detailed spec.

The evidence says write a *precise* spec — precise about the right things.

The "spec as source of truth" framing isn't wrong, it's incomplete. The spec is the source of truth for business logic and UI decisions. The codebase is the source of truth for technical patterns. Both are authoritative. They cover different things.

The most durable insight from nine experiments: spec-driven development is an iterative practice, not a one-shot generator. The value of a good spec isn't eliminating iteration — it's ensuring the important things are right in the first pass, so the iterations you do are on the right problems.

---

*The experiments were run on a Next.js + Express + Socket.io application. The merge feature was implemented across ten parallel runs — five ablative, five additive — using Claude Sonnet 4.5. All implementations were evaluated against eight criteria covering business logic correctness, data model fidelity, UI accuracy, and cross-view behavior.*
