# Blog Post Outline

**Title:** "Your Spec Needs Two Things. The Rest Your Codebase Already Knows."
**Subtitle:** "Nine experiments in spec-driven development — what we learned about what to write, what to skip, and the one phrasing mistake that broke every implementation."
**Target:** Medium / dev.to
**Audience:** Senior engineers and engineering leads already using AI coding tools who want to write better specs

---

## One-Sentence Thesis

The minimum viable spec for an existing codebase is business rules and UI guidance — everything else the LLM infers from your code.

---

## Structure

### 1. Hook (~200 words)

**Angle:** Everyone is telling you to write a spec. Nobody is telling you which parts matter.

The SDD space is full of advocacy — Thoughtworks put it on the radar, GitHub shipped Spec Kit, AWS shipped Kiro, every tool has an opinion. The consensus is: write a detailed spec, treat it as the source of truth, generate code from it.

What's missing from all of it: experimental evidence. Which spec categories actually produce correct implementations? Which parts does the LLM figure out on its own from your codebase? What's the minimum you can write and still get something ship-worthy?

We had the same concern — and we ran the experiments.

Briefly introduce: our team was adopting spec-driven development. We write real web applications. We had no specs — they were never preserved. When we decided to change that, we wanted practical guidelines, not theory. So we built the same application and the same feature multiple times, with every possible level of spec detail, and measured what actually mattered.

Close the hook with the thesis stated plainly.

---

### 2. What We Built and Why (~250 words)

**The application:** Toil Tracker — a real-time collaborative retrospective tool we actually needed. Engineers log their recurring work in a session; a facilitator reviews, flags automation targets, and exports results.

**Why this app specifically:**
- Small enough to build in one session, complex enough to have real design decisions: multi-user, distinct roles, real-time updates, facilitation workflow
- Not a todo app — important because LLMs have memorized thousands of todo implementations. We wanted the model to rely on our spec, not its training data.

**The feature we focused on for the integration experiments:** a merge feature — allows the facilitator to combine similar activities submitted by different engineers into one consolidated card. It touched every view, had specific business logic (a Jaccard similarity formula with exact weights), cross-cutting visibility rules, and a non-trivial UI. Rich enough to be a meaningful test.

**What we measured:** not just "does it run" — correctness of business logic, visual consistency, data model fidelity, cross-view behavior.

---

### 3. The Research Path (~350 words)

Walk through the full experiment series in compressed form. This is context, not the main event.

**Phase 1 — Greenfield (Experiments 01–04):** Same app, four spec types (problem statement / PM requirements / user-role / technical PRD). Finding: outputs deviated heavily from each other. All were incomplete. Hard to draw conclusions — too much randomness, too little shared baseline. The best outputs scored 18.5/25. The worst, 14.5/25. The gap was real but hard to attribute cleanly to spec type.

Key observation: spec *type* predicted agent surface quality more than UI quality. A technical PRD produced a better MCP server. A user-role spec produced sharper product flows. Neither was simply "better."

**Phase 2 — Building a Reference (Experiment 05):** We changed approach. Instead of spec-first, we built the ideal application first using Claude Design, iterating visually until we had exactly what we wanted. Important to name: even with screen-by-screen visual designs, the first pass required significant iteration. The gap between concept and ideal output isn't closed by any spec format alone.

Once we had the reference application, we generated its spec. The result: **83,000 tokens** across multiple files covering every screen, every data model field, every socket event, every rule.

**Phase 3 — Spec completeness test (Experiments 06–07):** We used that 83K-token spec to rebuild the application twice — once with Claude Composer, once with Claude Sonnet. Both produced strong results. Both deviated from the original in small but observable ways: minor UI differences, edge cases handled differently, one button missing in one version.

The takeaway: you cannot close the gap through spec detail alone. Even at 83K tokens, some variance persists. At some point you'd be copying the codebase into the spec — which defeats the purpose. The problem isn't spec *quantity*. It's spec *content*.

That realization sent us in a new direction: instead of asking "how detailed should the spec be," ask "which categories of spec content actually matter?"

---

### 4. The Integration Question — Ablation Study (Experiment 08) (~500 words)

**The setup:** Take the reference application. Strip out the merge feature. Re-implement it five times, each time with the full spec minus one category.

Categories removed per run:
- Run 1: all categories present (baseline)
- Run 2: no business rules
- Run 3: no UI guidance
- Run 4: no data layer
- Run 5: no technical interfaces

**Results table:**

| Category removed | Unique bugs introduced |
|---|---|
| Business rules | 4 |
| UI guidance | 0 (visual divergence only) |
| Data layer | 0 (field names invented, behavior correct) |
| Technical interfaces | 0 (inferred from codebase patterns) |

**The finding:** Business rules are categorically different from everything else. Removing them produced four unique functional bugs — the similarity formula was invented, visibility filtering was wrong, the merged result appeared incorrectly on the engineer board. Removing any other category produced at most one shared bug (a phrasing problem discussed in section 6).

**Why:** The codebase carries a lot of implicit specification — naming conventions, socket event patterns, component structure, TypeScript idioms, design tokens. The LLM reads the codebase and conforms. But no amount of codebase reading tells it that title similarity should weight at 85%, or that merged sources should hide from facilitator views but not engineer boards. Those have specific correct answers that only exist in the spec.

**The split that emerges:**
- Codebase = source of truth for: how to structure code, naming conventions, component usage, technical patterns
- Spec = source of truth for: formulas with specific values, visibility and permission rules, cross-cutting side effects, anything where there's one correct answer that doesn't exist yet in the code

This is the direct counter to the "spec as source of truth" framing. The codebase is *also* a source of truth — for a different class of information. The job of the spec is to cover only what the codebase can't.

---

### 5. The Minimum Viable Spec — Additive Study (Experiment 09) (~500 words)

**The setup:** Flip the ablation. Start with nothing, add one spec layer at a time. Five parallel implementations of the same merge feature.

| Output | Spec provided |
|---|---|
| 9.1 | 2-sentence problem statement |
| 9.2 | + business rules |
| 9.3 | + UI guidance |
| 9.4 | + data layer |
| 9.5 | + technical interfaces (full spec) |

**Results by layer:**

**9.1 (problem statement only):** A working merge feature. Respects the design system, uses existing components correctly, follows socket patterns — because the codebase taught it all that. But limiting: the merge modal only allowed editing the title of the new card, not the time/frequency/energy fields. The agent didn't think of that detail without being asked.

**9.2 (+ business rules):** The largest quality jump. Correct Jaccard formula (0.85/0.10/0.05). Correct view filtering. Correct 8-character UUID. Correct teamAuto reset. Cross-view behavior all correct. The agent also correctly left the engineer board and export unfiltered — because the spec said so. Business rules alone crossed the functional correctness threshold.

**9.3 (+ UI guidance):** Visual consistency locked in. Exact modal text, correct badge colors (rust above 0.6, amber above 0.3), correct two-column layout, correct button order. The outputs of 9.3 through 9.5 were nearly indistinguishable in user testing — minimal stylistic variation, identical functional behavior.

**9.4 and 9.5:** Precision improvements. Exact field names (`mergedFromIds`, `reportedBy`, `mergedFromColors`) in 9.4 — important for external consumers. Exact socket event names (`activity:merge`, `activity:merged`) and REST paths in 9.5 — important if other systems depend on your API contracts. Neither changed the visible quality of the feature.

**The inversion:** 9.2 (no data layer spec) produced the *richest* source card display in the expanded view — showing full card details for each merged source. 9.3 and 9.4, constrained by the data model spec's explicit field names, showed only what those fields carried. More spec produced a narrower solution. The agent without constraints found a better display. Spec should describe outcomes, not implementation details, unless precision is the actual requirement.

**The threshold:** Business rules + UI guidance. That's where "decent but incomplete" becomes "ship-worthy." Data layer and technical interfaces are precision investments for interoperability — not for functional correctness.

---

### 6. The Phrasing Problem — One Bug Across All 10 Implementations (~300 words)

Every single implementation — all 5 runs in experiment 08, all 5 runs in experiment 09 — had the same bug. The export view showed merged activities but didn't label or highlight them as merged. The function `buildMarkdownExport()` was untouched in every case.

The spec said: *"The REST export does NOT filter merged sources."*

That's a fact. A true fact. And completely invisible to every agent.

Here's why: agents implement *new* things. They add socket handlers, create components, write server routes. They don't scan existing functions to check whether they contradict a stated fact about system behavior.

The fix is one sentence: *"Modify `buildMarkdownExport()` to include activities where `isMergedSource: true` in their classified sections."*

The difference: passive fact vs. active instruction. The spec stated what the system *is*; it needed to state what to *do*.

Adding more spec detail — up to and including the full spec in 9.5 — did not fix this. The bug is immune to spec completeness. It's a spec *phrasing* problem.

**The practical rule:** Before finalizing any spec, scan for sentences that state facts about existing behavior. Every one of them is a passive rule. Convert them: name the file, name the function, write the instruction.

This is the most counterintuitive finding in the research. The thing that would have fixed the bug wasn't more detail — it was one word changed from "is" to "modify."

---

### 7. The Practical Framework (~350 words)

Pull it together as a decision tool.

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

**The one spec-writing habit that prevents the most bugs:** Scan your spec for passive rules — sentences that state facts about existing behavior ("X does not filter Y," "Z remains unchanged"). Convert every one to an active instruction naming the file and function. This is the fix for the phrasing problem that defeated every implementation in this research.

---

### 8. Rules of Thumb (~250 words)

A numbered list of portable, quotable rules — the kind readers screenshot and save. These are the condensed version of everything the experiments produced. Each should be one sentence of rule + one sentence of why.

1. **Write business rules. Always.** If a spec element has a formula, a threshold, a weight, or a visibility rule — write it. The LLM cannot infer specific correct values from codebase patterns.

2. **Your codebase is already a spec.** Naming conventions, component patterns, socket structure, design tokens — the LLM reads your code and conforms to it. Spec only needs to cover what isn't already there.

3. **Business rules + UI guidance = the minimum viable spec.** Below that, implementations diverge functionally. Above that, you're buying precision for external consumers, not functional correctness.

4. **Passive spec rules are invisible to the LLM.** "X does not filter Y" is a fact, not an instruction. The agent will never touch the function that contradicts it. Write instructions: "Modify [file] to do [action]."

5. **More spec can narrow the solution space in bad ways.** Without field name constraints, agents sometimes invent richer solutions. Spec what you care about; leave what you don't care about genuinely open.

6. **A richer spec reduces variance — it does not eliminate it.** Even at 83K tokens, outputs deviated. Plan for one iteration pass. The spec's job is to make that pass fast, not to prevent it.

7. **Iteration is not failure.** You will not know what you want until you see it. The spec's job is to make the first version close enough that discoveries become refinements, not rebuilds.

---

### 9. Closing (~200 words)

Return to the opening tension: everyone says write a detailed spec. The evidence says write a *precise* spec — precise about the right things.

The "spec as source of truth" framing isn't wrong, but it's incomplete. The spec is the source of truth for business logic and UI decisions. The codebase is the source of truth for technical patterns. Both are authoritative; they cover different things.

The most durable insight from all nine experiments: spec-driven development is an iterative practice, not a one-shot generator. The value of a good spec isn't eliminating iteration — it's ensuring the important things are right in the first pass, so the iterations you do are on the right problems.

You will always need to see the running application to discover what you didn't know you wanted. The spec's job is to make the first version close enough that those discoveries are refinements, not rebuilds.

---

## Tone Notes

- Confident, not academic. We ran the experiments. We know what we found.
- Show the failures as data. The export bug, the 9.5 LiveCard gap, the greenfield variance — these aren't embarrassments, they're the findings.
- Direct counter to "spec as source of truth" maximalism — position this explicitly, respectfully, with evidence.
- No hedging on the practical framework. Give the table. Let readers push back.

---

## Visuals

- Side-by-side merge modals from experiment 08 (5 outputs)
- 9.1 vs 9.3 modal comparison (no-spec vs minimum viable spec)
- The "when to specify what" decision table
- The spec layer quality matrix (layers × evaluation criteria)
