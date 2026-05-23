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

## Research Gap — What We Contribute

### What existing research covers

Existing work on spec/prompt quality and AI code generation (PartialOrderEval, REprompt, Midolo et al.) consistently varies one dimension: **how much detail** the prompt contains — more vs. less. The finding is consistent: more specific prompts produce better code.

But these studies test on **algorithm-level tasks** — HumanEval, function-level benchmarks. Not full applications.

And they stop at **"did the code work."** No study measures output across all four application surfaces.

The REST-to-MCP paper (Jul 2025) studies MCP server patterns, but assumes the API already exists. It says nothing about generating an MCP server from a spec.

### What we do differently

1. **Spec type, not just spec volume** — we compare qualitatively different *kinds* of spec (problem statement, PM requirements, user role behaviors, technical PRD), not just more vs. less detail of the same kind.

2. **Full application output** — we measure a complete deliverable: UI, API, MCP server, and skills. No existing study does this.

3. **AI-native surfaces as evaluation targets** — we specifically ask: does spec type affect MCP tool design and skill quality? This is entirely unexplored.

### Closest prior work to build from

The PartialOrderEval paper (arXiv 2508.03678) is the most direct predecessor. Their core finding — that LLM underperformance comes from insufficient specification, not missing model knowledge — is the baseline we extend. We go further: qualitatively different spec types, full application scope, AI-native surfaces included.

---

## Web Research Findings

### Spec-Driven Development — Prior Art

"Spec-driven development" (SDD) is now an established term. Thoughtworks placed it on their Technology Radar in **November 2025** at *Assess* status, describing it as an emerging AI-assisted coding approach that starts with a structured spec and decomposes it into tasks. Tools already in this space: Amazon Kiro, GitHub Spec Kit, Augment Code Intent.

The lineage: TDD (2000) → BDD (2003) → DDD (2003) → SDD (2025 commercial wave). SDD inherits BDD's "spec-by-example" idea but elevates the spec to the primary artifact and adds AI code generation as the delivery mechanism.

A January 2026 arXiv paper ([2602.00180](https://arxiv.org/html/2602.00180v1)) proposes a **three-tier spec continuum**:
- **Spec-First** — specs may drift post-launch
- **Spec-Anchored** — living docs synchronized with code
- **Spec-as-Source** — humans edit only specs; machines regenerate all code

Core thesis: "code is the implementation detail of the specification." The paper cites up to 50% error reductions when using refined specifications with LLMs.

Sources: [Thoughtworks Radar (Nov 2025)](https://www.thoughtworks.com/radar/techniques/spec-driven-development) · [Thoughtworks blog (Dec 2025)](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices) · [arXiv 2602.00180 (Jan 2026)](https://arxiv.org/html/2602.00180v1)

---

### AI Code Generation Quality vs. Requirements Completeness

The most directly relevant paper: **"More Than a Score: Probing the Impact of Prompt Specificity on LLM Code Generation"** (arXiv 2508.03678, August 2025). Used a partial-order framework to test prompts from minimal to maximally detailed on Llama-3.x and Qwen2.5-Coder. Key finding: LLM underperformance may stem from insufficient prompt specification rather than missing domain knowledge. Three drivers of improvement: explicit I/O specifications, edge-case handling instructions, and stepwise breakdowns.

**REprompt** (arXiv 2601.16507, Jan 2026): Applied four requirements engineering stages to prompts. Ablation study showed **requirements analysis absence caused the largest performance drop** among all components.

**"Guidelines to Prompt LLMs for Code Generation"** (arXiv 2601.13118, Jan 2026): 10 guidelines validated with 50 practitioners. Most frequently needed prompt improvements, in order: Algorithmic Details (57%), I/O Format (44%), More Examples (24%), Post-conditions (23%), Requirements (19%).

Sources: [arXiv 2508.03678](https://arxiv.org/abs/2508.03678) · [arXiv 2601.16507](https://arxiv.org/html/2601.16507v1) · [arXiv 2601.13118](https://arxiv.org/html/2601.13118v1)

---

### MCP Adoption Patterns

MCP (released by Anthropic November 2024) reached 97M monthly SDK downloads by late 2025. Over 16,000 MCP servers in production. OpenAI adopted it March 2025; Google DeepMind April 2025.

Key empirical paper: **"From REST to MCP"** (arXiv 2507.16044, July 2025), studying 116 official MCP servers and 80 real-world OpenAPI contracts:
- 88.6% of MCP servers are fully or partially REST-backed
- MCP servers expose a **median of 19% of available API operations** (curated, not exhaustive)
- Automated generation succeeded for 94.2% of tools after automated repair

Four exposure strategies now documented ([Stainless guide](https://www.stainless.com/mcp/api-mcp-server-architecture-guide)):
1. Full mapping (all endpoints)
2. Curated subset (hand-picked)
3. Composite tools (orchestrate multiple calls)
4. Dynamic tools (meta-tools for large APIs)

Consensus: MCP is a curated wrapper alongside REST, not a replacement. "MCP is becoming another way to expose services alongside REST."

Sources: [arXiv 2507.16044](https://arxiv.org/abs/2507.16044) · [Zuplo one-year retrospective (Nov 2025)](https://zuplo.com/blog/one-year-of-mcp) · [Stainless architecture guide](https://www.stainless.com/mcp/api-mcp-server-architecture-guide)

---

### AI Skills — Pre-Packaged Workflows

**Voyager** (arXiv 2305.16291, May 2023, NVIDIA/Caltech): First major system to implement an ever-growing skill library of executable code for an LLM agent. Widely cited origin point for skills-as-reusable-executable-knowledge.

**"SoK: Agentic Skills"** (arXiv 2602.20867, Feb 2025): Formalizes a skill as a four-component tuple (applicability condition, executable policy, termination condition, reusable interface). Distinguishes skills from tools (atomic) and plans (one-time). Key finding: **curated skills outperform self-generated ones by +16.2 percentage points**.

**Anthropic's Claude Skills system** (announced October 2025, open standard December 2025): A skill is a directory with a `SKILL.md` file (YAML frontmatter + Markdown instructions). Progressive disclosure: metadata costs ~100 tokens at startup; full body (~5,000 tokens) loads only when relevant. Framing: skills teach agents *how* to use tools; MCP provides tool *connectivity*.

Sources: [arXiv 2305.16291](https://arxiv.org/abs/2305.16291) · [arXiv 2602.20867](https://arxiv.org/html/2602.20867v1) · [Anthropic Engineering blog (Oct 2025)](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

---

## Open Research Questions

### Q1 — Greenfield threshold: how robust must a spec be to build an application from scratch?

When the codebase doesn't exist yet, the spec is the only source of truth the AI has. The question is: what is the minimum spec quality that reliably produces a full, working application?

**What to investigate:**
- At which of the four experiment tiers (problem statement → PM requirements → user role based → technical PRD) does output quality cross an acceptable threshold for all four surfaces (UI, API, MCP, skills)?
- Are some surfaces more sensitive to spec completeness than others? (Hypothesis: MCP tool design and skills may degrade earlier than the UI, since they require clearer domain modeling.)
- Is there a floor below which the AI makes decisions that are hard to reverse — data model choices, auth approach, session semantics — that later constrain the whole codebase?

**Practical output:** a minimum spec profile for greenfield AI builds — what categories of information must be present, and which can be omitted without significant quality loss.

---

### Q2 — Integration threshold: how minimal can a spec be when an existing codebase is present?

When a codebase already exists, the code itself carries implicit specification: data models, API contracts, naming conventions, interaction patterns. The AI can read the code and infer intent. This changes the question from "is the spec complete enough to build?" to "is the spec complete enough to *navigate and extend* what's already there?"

**What to investigate:**
- With codebase + minimal spec, which spec types from Q1 become sufficient that were insufficient for greenfield? (Hypothesis: a problem statement or PM-level spec may be enough to drive effective iteration when the codebase is readable.)
- What is the spec doing in the integration case — is it signaling *intent* (what to build next) vs. *context* (what the system is)? The codebase covers context; the spec only needs to cover intent.
- Where does minimal-spec iteration break down? Candidates: cross-cutting changes (refactors, auth changes, schema migrations), new surfaces (adding MCP when only a UI existed), features with no existing analog in the codebase.

**Practical output:** a minimum spec profile for AI-assisted iteration — and a decision rule for when a spec needs to be upgraded to greenfield quality (i.e., when the existing codebase stops being a reliable substitute for missing spec).
