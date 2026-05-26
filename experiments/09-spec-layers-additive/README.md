# Experiment 09 — Spec Layers Additive Study

## Purpose

This experiment addresses the same Q2 question as Experiment 08 (integration threshold), but from the opposite direction: **additive rather than ablative**.

Where Experiment 08 removed one spec category at a time from a full spec, this experiment starts with almost no spec and adds one category at a time. The goal is to find the point at which implementation quality crosses "good enough" — that point defines the minimum viable spec when working with an existing codebase.

The secondary goal is to validate the priority order implied by Experiment 08:  
**business rules > UI guidance > data layer > technical interfaces**

---

## Setup

**Base codebase:** `experiments/08-adding-merge-feature/base-codebase/` — the reference implementation with the merge feature removed.

**Task given to Claude each run:** "Add the merge feature to this application." (plus the spec layer for that run)

**What changes per run:** How much spec is provided, accumulated layer by layer.

---

## Runs

| Output | Port | Spec layers provided | Browser tab |
|---|---|---|---|
| output-1-no-spec | 3061 | Problem statement only (2 sentences) | Work Audit [9.1] |
| output-2-business-rules | 3062 | + Business rules (similarity formula, view filtering, merge result rules) | Work Audit [9.2] |
| output-3-plus-ui-guidance | 3063 | + UI guidance (modal layout, button placement, badge colors) | Work Audit [9.3] |
| output-4-plus-data-layer | 3064 | + Data layer (field names, types, ID format) | Work Audit [9.4] |
| output-5-plus-tech-interfaces | 3065 | + Technical interfaces (socket events, REST endpoints) | Work Audit [9.5] |

Each run's spec is in `output-N/spec.md`. Each spec is cumulative — it contains all layers up to and including its own.

---

## Evaluation Criteria

Same 8 criteria as Experiment 08:

1. **Similarity formula** — Does the implementation use Jaccard + freq + tpo weights (0.85 / 0.10 / 0.05)?
2. **Data model** — Are all merge tracking fields present (`isMergedSource`, `mergedIntoId`, `mergedFromIds`, `reportedBy`, etc.)?
3. **Source visibility** — Are merged source cards hidden in facilitator views but preserved in state?
4. **Merged result ID** — Does the merged result get an 8-char truncated UUID?
5. **teamAuto reset** — Is classification always reset to `unclassified`?
6. **Modal UI** — Two-column layout, source card locked, search, similarity badges?
7. **Socket event** — Does the client emit `activity:merge` and handle `activity:merged`?
8. **Cross-view filtering** — Do live, matrix, grouped, and discuss views filter `isMergedSource: true`?

---

## Hypothesis

- Output 1 (no spec): Implementation exists but with significant gaps — invented similarity logic, inconsistent field names, UI varies widely
- Output 2 (+ business rules): Largest quality jump — correctness of core logic improves, view filtering correct, formula correct
- Output 3 (+ UI guidance): Visual consistency improves; modal structure matches spec
- Output 4 (+ data layer): Field names align; fewer type mismatches between client/server
- Output 5 (+ tech interfaces): Socket event names and REST paths match exactly

**The key question:** At which layer does quality become "ship-worthy"? That layer defines the minimum viable spec for iterating on an existing codebase.
