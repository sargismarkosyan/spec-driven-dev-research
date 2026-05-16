# Research Notes

Running notes on the design and context behind this project. Updated as we learn.

---

## The Core Research Question

Does spec quality meaningfully change what AI builds — and in what ways?

More specifically: when you give Claude the same build task with four different styles of specification, how does the output differ?

---

## The App: Toil Tracker

A purpose-built tool for engineering teams to audit their daily work and surface automation opportunities.

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

---

## The Four Surfaces of an AI-Native Application

A complete application deliverable has four surfaces:

| Surface | Consumer | Description |
|---|---|---|
| **UI** | Humans | Web frontend |
| **API** | Other services / apps | REST HTTP layer |
| **MCP Server** | AI agents | Streamable MCP server exposing the app's domain operations |
| **AI Skills** | AI + humans | Pre-packaged workflows that use the MCP tools |

**Architecture constraint:** The app is always split into an API layer and a UI layer. No server-side-rendered monoliths. The UI talks to the API; the MCP server exposes the same domain through a separate interface.

Each experiment is expected to produce all four surfaces.

---

## Prompt Strategy

Single spec per experiment. The spec is given once; the build may use multiple targeted prompts (one per surface) but the spec does not change between them.

---

## Web Research To-Do

Areas to research before drawing conclusions:

- [ ] Existing research on prompt engineering and spec quality
- [ ] Prior work on AI-generated MCP servers
- [ ] "Spec-driven development" as a term — prior art, definitions
- [ ] Research on AI code generation quality vs. requirements completeness
- [ ] MCP adoption patterns — how are teams currently exposing apps to agents?
