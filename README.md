# Spec-Driven Development Research

An iterative research project exploring **what makes a great spec** — and whether spec quality meaningfully affects what AI builds.

## The Question

Does the *type* of spec you write change the quality of what Claude produces? We run the same build task four times, each time with a different style of specification, and document what we observe.

## The App We're Building

**Toil Tracker** — a purpose-built tool for engineering teams to audit their daily work activities, identify what's repetitive or painful, and surface automation opportunities. Think: a structured retro format where engineers describe their duties and tag them (automate / enjoy / hate / time sink / can swap), producing a prioritized list of candidates for automation.

Used by: an engineering team lead running a retrospective session with their team.

## The Four Experiments

| # | Spec Approach | What Claude receives |
|---|---|---|
| [01 — Problem Statement](experiments/01-problem-statement/) | Problem only | 2–3 sentences describing the problem |
| [02 — PM Requirements](experiments/02-pm-requirements/) | High-level requirements | User stories, acceptance criteria, no technical detail |
| [03 — User Role Based Action](experiments/03-user-role-based/) | Behavioral spec | Who the user is, what they do, the approach taken |
| [04 — Technical Requirements](experiments/04-technical-requirements/) | Full PRD | Data model, components, tech stack, epic-style requirements |

**Fixed variable:** Claude Sonnet 4.6 for every experiment. The only thing that changes is the spec.

## What We Evaluate

Each experiment is assessed on:
- **Completeness** — does it cover the core use case?
- **Correctness** — does the code actually work?
- **Design decisions** — did Claude make sensible architecture choices?
- **Surprises** — what did it get right unprompted? What did it miss?
- **Effort to correct** — how much follow-up was needed?

## Structure

```
experiments/
  01-problem-statement/
    spec.md          ← the spec we gave Claude
    prompt.md        ← the exact prompt sent
    output/          ← generated code/content
    findings.md      ← what we observed
  02-pm-requirements/
  03-user-role-based/
  04-technical-requirements/
learnings.md         ← running synthesis across experiments
blog-draft.md        ← building toward the Medium post
```

## Status

- [ ] 01 — Problem Statement
- [ ] 02 — PM Requirements
- [ ] 03 — User Role Based Action
- [ ] 04 — Technical Requirements
- [ ] Synthesis + blog draft
