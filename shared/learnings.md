# Research Learnings

Key insights captured during the spec-driven development experiments. These feed directly into the blog post's "What We Learned" section.

---

## L1: Spec Completeness Does Not Guarantee Output Consistency

**Observed in:** Examples 6 and 7 — same detailed spec, different models.

**Finding:** Even when a spec is comprehensive enough to cover nearly every requirement, the generated outputs are still not identical. The outputs are very similar and strong first results, but subtle differences always emerge:

- UI surface variations: one output included a "Complete" button the other omitted
- Icon rendering differences
- Minor layout shifts

**Why it happens:** During code generation, the LLM makes small autonomous adjustments — micro-decisions about implementation detail that the spec leaves open. These are not random errors; they're plausible interpretations. But they accumulate into a measurable gap between outputs.

**The implication:** There is a floor of non-determinism that spec detail cannot eliminate. A richer spec raises the quality floor and reduces the variance range, but it cannot reduce variance to zero. You can get very close, but full reproducibility requires either locking the model, fixing the seed, or generating code once and versioning it — not re-generating from spec.

**Blog post angle:** Reframe the finding positively — the spec narrows the distribution of possible outputs dramatically. The remaining variance is in fine-grained UI choices, not in architecture, core features, or domain correctness. That's a meaningful result: spec quality determines *what class of application* gets built; model non-determinism determines *which flavor* within that class.

---

## L2: Business Rules Are the Only Truly Non-Inferrable Spec Category

**Observed in:** Experiment 08, output-4 (no business rules) vs all other outputs.

**Finding:** Removing business rules from the spec caused 4 unique bugs — the most of any ablation run. Removing any other spec category (UI guidance, data layer, tech interfaces) caused at most 1 shared bug. Business rules contain specific values (formulas, thresholds, weights, visibility rules) that the LLM has no way to infer from codebase patterns. Everything else — field names, socket event naming, REST paths, UI layout — the LLM can approximate from existing code conventions.

**Why it happens:** The codebase carries a lot of implicit knowledge: naming conventions, component patterns, socket/REST structure, TypeScript idioms, design system usage. An LLM reading the codebase will conform to all of these naturally. But no amount of codebase reading will tell it that title similarity should be weighted at 85%, or that merged sources should be hidden from facilitator views but not from engineer boards. These are domain decisions with specific correct answers that only exist in the spec.

**The implication:** When iterating on an existing codebase, the minimum required spec content is the business logic — the parts with specific correct values, cross-cutting effects, and permission rules. Technical patterns can be inferred; domain logic cannot.

**Blog post angle:** Frame the split clearly: *codebase as source of truth for how; spec as source of truth for what and why.* The codebase answers "how do we structure a socket event?" The spec answers "what should this socket event actually do and under what conditions?"

---

## L3: The Minimum Viable Spec Threshold Is Business Rules + UI Guidance

**Observed in:** Experiment 09, comparing outputs 9.2 through 9.5.

**Finding:** Outputs 9.3, 9.4, and 9.5 were nearly visually and functionally identical to each other — minimal stylistic differences. The significant quality jump was from 9.1 (no spec) to 9.2 (business rules), and from 9.2 to 9.3 (+ UI guidance). Adding the data layer or tech interfaces on top of 9.3 produced only marginal improvements.

**Why it happens:** Business rules give the LLM the correct *behavior*. UI guidance gives it the correct *appearance and interaction model*. Once those two are specified, the data field names and socket event names are details the LLM fills in from codebase patterns — imperfectly, but well enough. External interoperability requirements (other systems calling your API, MCP tools reading your data) are the only case where tech interface and data layer precision become critical.

**The implication:** For an internal feature on an existing codebase: write business rules + UI guidance, ship, and iterate. For features that expose an external API or integrate with external systems: also specify the data layer and tech interfaces to ensure naming precision.

---

## L4: Passive Spec Rules Are Consistently Missed

**Observed in:** Experiments 08 and 09 — all 10 implementations, across both experiments.

**Finding:** Every single implementation failed to update `buildMarkdownExport()` to reflect merged activities. The spec said "the REST export does NOT filter merged sources." All 10 agents left the export function untouched. Zero for ten, across two separate experiments.

**Why it happens:** The spec stated a *fact* about what the export does, not an *instruction* about what to change. Agents implement new things; they don't look for existing functions that contradict a stated fact and modify them proactively. A rule written as "X does not do Y" is invisible unless the agent happens to look at X and notice the discrepancy.

**The implication:** Spec rules must be written as actions, not facts. Not "the export does not filter sources" — instead: "modify `buildMarkdownExport()` to include activities where `isMergedSource: true` in their classified sections." If a spec rule requires touching existing code rather than writing new code, name the file and function explicitly.

**Blog post angle:** This is the sharpest, most counterintuitive finding. More spec detail did not fix this bug — all 5 outputs in experiment 08 (including the full-spec baseline) had it. The issue is not spec completeness; it's spec *phrasing*. Passive facts vs. active instructions is a spec-writing skill distinct from spec completeness.

---

## L5: An Existing Codebase Dramatically Reduces Spec Requirements

**Observed in:** Experiment 09, output 9.1 (no spec), and cross-experiment comparison.

**Finding:** Even with only a 2-sentence problem description, output 9.1 produced a working merge feature that respected the application's design system, used existing UI components correctly, and followed the established socket/REST patterns. Starting from scratch (experiments 1–5, no existing codebase), even detailed specs produced high variance. The codebase is a powerful prior.

**Why it happens:** A well-structured codebase carries enormous implicit specification: design tokens, component library usage, naming conventions, data flow patterns, file organization, TypeScript type patterns. An LLM reading the codebase absorbs all of this and defaults to matching it. Spec is only needed for the delta — what the codebase *doesn't* already tell the LLM.

**The implication:** The two-phase workflow emerges naturally from this finding. Phase 1: generate a baseline application (using a design tool like Claude Design, v0, or Bolt) — this produces both a codebase *and* an implicit design language. Phase 2: iterate on features with minimal spec (business rules + UI guidance), letting the codebase carry everything else.

**Blog post angle:** This reframes how practitioners should think about spec investment. The question isn't "how detailed should my spec be?" It's "how much of what I need is already in my codebase?" The richer the existing code, the less spec you need per feature.

---

## L6: Spec-Driven Development Is an Iterative Practice, Not a One-Shot Generator

**Observed in:** All experiments combined.

**Finding:** No single experiment produced a perfect first-shot implementation. Every run had at least one unexpected choice, one missed edge case, or one visual divergence. The value of a detailed spec is not eliminating iteration — it's reducing the number of iterations required and ensuring the *important* things (business logic, core UX) are correct in the first pass rather than discovered in the third.

**Why it happens:** It is impossible to capture everything in a spec. Specs are written by humans who have a mental model of the feature; they miss things that feel obvious or implicit. The LLM also makes micro-decisions the spec leaves open, which accumulate into deviation. Some of those decisions are wrong in ways that only become visible when you see the running application.

**The implication:** The right mental model for spec-driven development is: *write enough spec to get a good first version, then iterate visually on the running output.* Don't try to write a perfect spec before building. Write business requirements and critical UX decisions, build, observe, refine the spec with what you learned, build again. The spec is a living document, not a waterfall artifact.

**Blog post angle:** This is the human insight that ties the whole series together. AI is not a vending machine where you insert a spec and receive a finished product. It's a fast, capable collaborator that needs direction on what matters and freedom on what doesn't. The developer's job is to know which is which — and that judgment is refined through iteration, not upfront planning.

---

## L7: More Spec Can Constrain Agent Creativity in Unexpected Ways

**Observed in:** Experiment 09, comparing output 9.2 vs 9.3/9.4 on merged result card display.

**Finding:** Output 9.2 (business rules only, no data model spec) produced the richest expandable source card display — showing full card details for each source activity. Outputs 9.3 and 9.4, which had the data model spec specifying exact field names (`mergedFromNames`, `mergedFromInitials`, etc.), showed only names and initials in the expandable section — precisely what those fields carry, nothing more.

**Why it happens:** With a constrained data model, the agent implemented exactly what the spec described. With no data model constraint, the agent had access to the full source activity objects and chose to display them richly. More specification narrowed the solution space and inadvertently excluded a better approach.

**The implication:** Spec should describe *outcomes and constraints*, not *implementation details*, unless implementation precision is the actual requirement. Specifying field names when you only care about the display outcome may produce a technically compliant but experientially inferior result compared to leaving the implementation open.

**Blog post angle:** Use this as a nuance — spec is not always "more is better." Knowing *what* to specify and *what to leave open* is as important as the spec content itself.
