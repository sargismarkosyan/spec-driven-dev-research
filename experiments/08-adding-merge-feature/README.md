# Experiment 08 — Adding the Merge Feature (Ablation Study)

## Purpose

This experiment addresses **Q2: integration threshold** — how minimal can a spec be when an existing codebase is already present?

The approach is an ablation study: start with the full merge feature spec, then remove one spec category at a time and ask Claude to add the merge feature to the Experiment 05 codebase. By comparing each run against the baseline (full spec), we identify which spec categories are essential and which become redundant when the codebase already exists.

---

## Setup

**Base codebase:** `experiments/05-calude-design/output/` — the reference implementation, with the merge feature removed.

**Task given to Claude each run:** "Add the merge feature to this application."

**What changes per run:** Which categories of the spec are included in the prompt.

---

## Spec Categories

| Category | Spec sections | Contents |
|---|---|---|
| A — Product Context | `01-overview` | What the app is, who the users are, session lifecycle |
| B — Data Model | `02-data-model` | Entities, fields, enumerations, calculations |
| C — UI Flows | `03-engineer-flow`, `04-facilitator-flow` | Every screen and interaction |
| D — Technical Interfaces | `05-real-time`, `06-rest-api` | Socket events and REST endpoints |
| E — Agent Surface | `07-mcp-server`, `08-ai-skills` | MCP tools and skills |
| F — Design System | `09-design-system` | Colors, typography, components, layout |
| G — Business Rules | `10-business-rules` | Merge logic, permissions, edge cases |
| H — Non-Functional | `11-non-functional` | Concurrency, storage, single-process |

---

## Ablation Runs

| Run | Spec provided | Category removed | Hypothesis |
|---|---|---|---|
| 00 — Baseline | Full merge spec (all categories) | None | Reference quality ceiling |
| 01 | All except G | No business rules | Similarity formula invented; merge visibility wrong |
| 02 | All except C | No UI spec | Modal structure guessed; layout wrong |
| 03 | All except B | No data model | Merge tracking fields wrong or missing |
| 04 | All except D | No technical interfaces | Socket event and endpoint contracts invented |
| 05 | All except F | No design system | Functional but visually diverges |
| 06 | All except A | No product context | Likely unaffected — codebase carries this |
| 07 | All except H | No non-functional | Likely unaffected — codebase carries this |

---

## Evaluation Criteria

For each run, assess:

1. **Similarity formula** — Does Claude use the correct Jaccard + freq + tpo weights (0.85 / 0.10 / 0.05)?
2. **Data model** — Are all merge tracking fields present (`isMergedSource`, `mergedIntoId`, `mergedFromIds`, `reportedBy`, etc.)?
3. **Source visibility** — Are merged source cards hidden in facilitator views but preserved in state?
4. **Merged result ID** — Does the merged result get an 8-char truncated UUID (not a full UUID)?
5. **teamAuto reset** — Is classification always reset to `unclassified` on the merged result?
6. **Modal UI** — Two-column layout, source card always selected, search, similarity badges?
7. **Socket event** — Does the client emit `activity:merge` and handle `activity:merged` correctly?
8. **Cross-view filtering** — Do live, matrix, grouped, and discuss views filter `isMergedSource: true`?

---

## Merge Spec

See [`spec-extract.md`](./spec-extract.md) — all merge-related spec content compiled from across the full spec, organized by category.
