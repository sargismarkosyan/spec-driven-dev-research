# Research Notes

Running notes on the design, thinking, and context behind this project. Updated as we learn.

---

## The Core Research Question

**Does spec quality meaningfully change what AI builds — and in what ways?**

More specifically: when you give Claude the same build task with four different styles of specification, how does the output differ across completeness, correctness, design quality, and AI-native surfaces?

---

## The App: Toil Tracker

A purpose-built tool for engineering teams to audit their daily work and surface automation opportunities.

**Why this app:**
- Niche enough that AI won't auto-complete it from a well-known template
- Simple enough to build in one session
- Has a clear domain vocabulary (activities, tags, sessions, leads, engineers) — good for testing whether specs transfer domain knowledge

**The problem it solves:**
Engineering teams accumulate repetitive, manual work over time but rarely stop to audit it. Standard retro formats don't address it. This tool runs as a structured retro session where engineers list their recurring activities and tag them, producing a prioritized list of automation candidates.

**Core flow:**
1. Lead creates a session, shares a link
2. Engineers join (no login), list their recurring activities
3. Each activity is tagged: time cost / enjoyment / repetitiveness / automation potential
4. Lead sees aggregated view, marks priorities, exports the list

**Users:**
- **Team Lead** — facilitates, views aggregate results, marks priorities
- **Engineer** — submits and tags their own activities

---

## The Four Experiments

Ordered from least to most specified. Fixed variable: **Claude Sonnet 4.6** for every experiment.

| # | Approach | What Claude receives |
|---|---|---|
| 01 | Problem Statement | 2–3 sentences: the problem only |
| 02 | PM Requirements | User stories + acceptance criteria, no technical detail |
| 03 | User Role Based Action | Who the users are, what they do, the approach taken |
| 04 | Technical Requirements | Full PRD: data model, epics, tech stack, components |

**Rationale for the ordering:** Each layer adds a new type of signal. Going in this order lets us see exactly what each layer buys us, rather than conflating multiple changes at once.

---

## The Four Surfaces of an AI-Native Application

A key thesis of this research: a *complete* application deliverable in the AI age is not just a UI and a backend. It has four surfaces:

| Surface | Consumer | Description |
|---|---|---|
| **UI** | Humans | Web frontend (React or equivalent) |
| **API** | Other services / apps | REST HTTP layer |
| **MCP Server** | AI agents | Streamable MCP server exposing the app's domain operations |
| **AI Skills** | AI + humans | Pre-packaged workflows that use the MCP tools |

Today most apps ship the first two. The argument is that shipping all four makes an app immediately accessible to both humans and AI agents — and that this will become the expected standard.

**Architecture constraint:** The app is always split into an API layer and a UI layer. No server-side-rendered monoliths. The UI talks to the API; the MCP server exposes the same domain through a separate interface.

---

## Hypotheses

1. **More spec → better output** — the most detailed spec (technical requirements) will produce the most complete and correct app overall.

2. **MCP + skills show the highest variance across spec types** — the UI is easy to hallucinate reasonably from any spec. Good MCP tool design requires understanding the domain's operations and vocabulary, which only richer specs provide. The skills layer requires knowing which workflows are valuable — a product insight question that problem statements can't answer.

3. **User role based spec punches above its weight** — because it supplies domain vocabulary (what actions users take), which maps directly to MCP tool names, API endpoints, and skill steps, without needing to spell out technical implementation.

4. **Problem statement will produce a working app but wrong MCP surface** — the AI will make reasonable but generic tool names and miss the specific operations that make the MCP actually useful.

---

## Prompt Strategy

**Single spec, potentially one prompt per surface** — the spec stays fixed, but we may prompt separately for each surface (app, MCP server, skills). This reflects realistic usage: one brief, multiple targeted outputs.

The question we're still deciding: does a single prompt yielding all four surfaces in one shot produce better or worse results than four targeted prompts from the same spec? This is a secondary experiment worth noting.

---

## Evaluation Dimensions

Each experiment is scored on:

- **Completeness** — does it cover the core use case across all four surfaces?
- **Correctness** — does the code run without intervention?
- **Design decisions** — did Claude make sensible architecture choices unprompted?
- **MCP quality** — are the tool names, arguments, and descriptions domain-appropriate?
- **Skills quality** — are the pre-packaged workflows actually useful?
- **Effort to correct** — how much follow-up prompting was needed?

---

## Open Questions

- Does generating all four surfaces in a single prompt produce coherent output, or do the surfaces conflict with each other?
- Does the spec type affect MCP quality more than it affects UI quality?
- Is there a minimum viable spec — a threshold below which the MCP surface degrades sharply?
- Would the same experiments with a different model (e.g., Opus) yield meaningfully different results?

---

## Web Research To-Do

Areas to research before drawing conclusions:

- [ ] Existing research on prompt engineering and spec quality
- [ ] Prior work on AI-generated MCP servers
- [ ] "Spec-driven development" as a term — prior art, definitions
- [ ] Research on AI code generation quality vs. requirements completeness
- [ ] MCP adoption patterns — how are teams currently exposing apps to agents?
