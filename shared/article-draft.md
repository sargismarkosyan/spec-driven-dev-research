# What Makes a Great Spec? Four Experiments with AI-Driven Development

> **Status:** Work in progress — first-pass findings documented; iteration phase and final conclusions pending.
> Placeholders marked with `[TBD]` will be filled in after experiments reach their ideal state.

---

## The question nobody is asking loudly enough

Everyone is talking about how AI writes code. Very few people are asking what you have to give it first.

The spec. The prompt. The design document. The user story. Whatever you call it — the thing you hand to the model before it starts building. That input is the actual variable. And most teams are treating it as an afterthought.

We decided to take it seriously.

---

## The setup

Spec-driven development — the practice of writing a detailed specification before generating code — is having a moment. Thoughtworks added it to their radar in November 2025. The intuition is straightforward: if you want AI to build the right thing, you need to tell it what the right thing is with enough precision that it can't get it wrong.

But what does "enough precision" actually mean? More words? A specific format? User stories? A data model? Nobody had tested this systematically, so we did.

We picked a real application to build — a **Toil Tracker**, a real-time collaborative tool for engineering teams to audit their recurring work and surface automation opportunities. Teams use it in retrospectives: engineers log their toil (repetitive tasks, manual processes, anything that grinds them down), and a facilitator identifies what's worth automating first.

It's small enough to build in one session, complex enough to have real design decisions: a multi-user session model, different roles (engineers vs. facilitators), real-time updates, and a facilitator workflow that involves filtering, flagging, and exporting results.

We then wrote **four different specs** for the same app:

| # | Spec type | What it contains |
|---|---|---|
| 01 | Problem statement | 2–3 sentences describing the problem |
| 02 | PM requirements | User stories + acceptance criteria |
| 03 | User role based | Who the users are, their goals, the workflow |
| 04 | Technical requirements | Full PRD: data model, tech stack, epics, component structure |

Same app. Same model (Claude Sonnet 4.6). Same base starter project. Only the spec changed.

---

## What we were measuring — and why it's not just "does the code work"

Most evaluations of AI-generated code ask one question: does it run? We asked five.

Modern AI-native applications aren't just UIs and APIs. They have four distinct surfaces:

1. **UI** — the web frontend that humans interact with
2. **API** — the backend that the UI calls
3. **MCP server** — a machine-readable interface that AI agents use to interact with the app programmatically
4. **AI skills** — pre-packaged workflow instructions that tell an AI agent how to use the app to accomplish a specific job

The MCP server and skills are new terrain. An MCP (Model Context Protocol) server exposes your app's operations as tools that an agent can call — think of it as an API designed for AI rather than humans. Skills are the complement: they're instruction sets that tell the agent *when* and *how* to use those tools in sequence to accomplish something useful.

We scored each experiment on five dimensions, 1–5:

- **Completeness** — Are all four surfaces present and covering the core use case?
- **Code Correctness** — Does it run? Does the core flow work end to end?
- **Architecture & Design** — Did the model make sensible structural choices unprompted?
- **MCP Quality** — Are the MCP tools well-designed for the domain?
- **Skills Quality** — Are the AI skills genuinely useful and domain-specific?

We also ran a real agent test for each experiment: using Cursor's Composer agent with only the MCP server enabled, we asked it to create a session, add activities, and show us the facilitator view. This revealed something the code review couldn't.

---

## The experiments

### Experiment 01 — Problem Statement

**The spec:** 2–3 sentences. The problem, the users, the goal. No requirements. No data model. No user flows.

**What Claude built in one shot:** A full four-surface application. Session creation, engineer activity submission, facilitator review panel with close-session. An MCP server with six domain-appropriate tools. Two AI skills — one for engineers logging toil, one for facilitators running the review.

The data model Claude invented: activities described by `painLevel` (1–5), `frequency`, and `minutesPerOccurrence`. A pain-and-time-cost framing — valid, but different from what the other three experiments produced.

**What it got right unprompted:**
- The MCP tool set covers the complete workflow end to end — both engineer and facilitator
- The skills are the best human-workflow scaffolding of all four experiments; `log-toil` includes pain-level guidance, `facilitate-review` includes a real facilitation script
- Runtime coherence is perfect: every tool name and field the skills reference exists in the actual MCP server

**What it missed:**
- Link sharing: gave engineers a session ID, not a clickable URL
- The facilitator view required manually running a console command to set localStorage — a leaky implementation detail
- Activities were add-only; no edit or delete

**MCP test result:** Everything worked. The agent created a session, added activities, and returned the facilitator link — though it also had to instruct the user to set localStorage manually to access the facilitator view.

**Score:** 18 / 25

**One-sentence takeaway:** A 2–3 sentence problem statement produced the most internally coherent agent surface of all four experiments, but invented its own data model and missed the shareable-link UX detail that makes the app actually usable.

---

### Experiment 02 — PM Requirements

**The spec:** User stories and acceptance criteria. "As a facilitator, I can filter activities by automation potential." "As an engineer, I can submit an activity with four tags." No data model. No technical detail.

**What Claude built in one shot:** The strongest facilitator UI of all four: filtering by automation potential, flagging, export of flagged items, close session, and an explicit "copy engineer link" button. The MCP server, however, was designed only for post-session analysis: `get_session`, `list_activities`, `summarize_session`, `get_automation_candidates`. No `create_session`. No `add_activity`.

**What it got right unprompted:**
- "Copy engineer link" — explicit, clickable, correct
- Export of flagged items — the only experiment to include this in the UI from the start
- `get_automation_candidates` implements a sensible scoring algorithm

**What it missed:**
- MCP tools for session creation and activity submission — entirely absent
- During the agent test, the LM had to fall back to direct API calls to add activities
- No skill for engineers; all three skills cover facilitator workflows only

**MCP test result:** Partially worked. Missing `add_activity` forced the agent to use the HTTP API directly as a workaround.

**Score:** 14.5 / 25

**One-sentence takeaway:** PM user stories translated well into UI features but actively failed at prompting agent surface design — the MCP covered only post-session analysis, not the operations needed to run a session.

---

### Experiment 03 — User Role Based

**The spec:** Who the users are, what they're trying to accomplish, the workflow approach. Role descriptions, goals, the key flow from session creation to export. No data model. No technical detail.

**What Claude built in one shot:** The best onboarding UX of all four. After session creation, the app immediately navigated to a "share link with engineers" screen — the only experiment to make this the natural next step. A flagging mechanism in the facilitator view. A working reviewing mode (the only experiment where this feature actually functioned). Three AI skills with the best guardrails of all four experiments — explicit scoring tables, "ask before mutating" constraints, step-by-step instructions.

The MCP: no `create_session`, no `add_activity`. Only read, filter, flag, and set-priority tools.

**What it got right unprompted:**
- The session → share-link flow is the sharpest product-moment thinking across all four experiments
- Reviewing mode works (Exp 04 built it but it's broken)
- The skills' scoring model (`automatable=yes +3`, `repetitive=yes +2`, `duration=significant +2`) matches the server's implementation function exactly — the model inferred the same weighting logic from the role description

**What it missed:**
- MCP tools for session creation and activity submission — same gap as Exp 02
- Data was harder to access during agent testing compared to other experiments

**MCP test result:** Failed for the engineer workflow. The agent could not create a session or add activities via the MCP. Even reading data was harder than expected.

**Score:** 15.5 / 25

**One-sentence takeaway:** A user-role spec produced the sharpest product thinking and the most precise skill-MCP alignment, but left the engineer workflow entirely off the agent surface — because the spec described what users do, not what an agent needs to do it for them.

---

### Experiment 04 — Technical Requirements

**The spec:** A full PRD. Data model with field names and types. Tech stack. Epics broken into stories. Component structure. The most prescriptive of the four.

**What Claude built in one shot:** The most technically complete application. Full CRUD on activities — the only experiment with edit and delete. An MCP server with 8 tools covering the complete workflow: `create_session`, `join_session`, `add_activity`, `update_activity`, `list_activities`, `flag_activity`, `close_session`, `export_session`. FacilitatorToken-based access control on sensitive operations. Real-time Socket.io events on mutations. Three AI skills with PM tool output formats (Linear, Jira, GitHub Issues) and Given/When/Then acceptance criteria.

The UI: no link-sharing mechanism. The reviewing mode: built, but broken.

**What it got right unprompted:**
- The only MCP test that worked perfectly on the first try — no workarounds, correct facilitator link returned
- `join_session` tool lets agents register as named participants
- `update_activity` includes ownership validation (participantId must match)
- FacilitatorToken auth is the only experiment to implement role-based access control on the agent surface
- `export_session` returns clean structured JSON — the most usable data export

**What it missed:**
- No link-sharing mechanism in the UI — the most critical UX moment for a facilitator
- Reviewing mode exists in the UI but is broken
- Skills don't mention the `facilitatorToken` requirement for `flag_activity`, which would cause an agent following the skill to fail

**MCP test result:** Perfect. Every tool worked. The agent created a session, added activities, and navigated the facilitator view without any workarounds.

**Score:** 18.5 / 25

**One-sentence takeaway:** A full technical PRD produced the only MCP that worked perfectly on the first try, but the prescriptive technical detail came at the cost of the UI's most critical product moment — sharing the session link.

---

## The comparison

| Dimension | 01 Problem Statement | 02 PM Requirements | 03 User Role Based | 04 Technical |
|---|---|---|---|---|
| Completeness | 3 | 3 | 3 | 3 |
| Code Correctness | 4 | 3 | 3 | 3 |
| Architecture & Design | 3 | 3 | 4 | 3 |
| MCP Quality | 4 | 2 | 1 | 5 |
| Skills Quality | 4.0 | 3.5 | 4.5 | 4.5 |
| **Total** | **18** | **14.5** | **15.5** | **18.5** |
| **Prompts to ideal state** | [TBD] | [TBD] | [TBD] | [TBD] |

---

## What we found so far

### Finding 1: Spec type predicts agent surface quality more than UI quality

The user-facing experience was surprisingly similar across all four experiments. When we reviewed the facilitator views, the differences were hard to name. But MCP quality swung from 1 to 5 entirely based on spec type.

The spec's framing determines how Claude thinks about the agent surface. A problem statement leaves it free to think about operations. PM stories frame everything as user actions — which maps to UI components, not tool calls. A technical PRD with a data model and epics maps directly to MCP tools because it's already describing what the system does rather than what users feel.

### Finding 2: Every spec type produced a different data model

| Experiment | Key activity fields |
|---|---|
| 01 Problem Statement | `painLevel` (1–5), `frequency`, `minutesPerOccurrence` |
| 02 PM Requirements | `automationPotential`, `timeEstimate`, `enjoyment`, `repetitiveness` |
| 03 User Role Based | `automatable`, `repetitive`, `duration` |
| 04 Technical | `automatable`, `timeEstimate`, `enjoyment`, `repetitive` |

No two experiments used identical field names. Exp 01's model was conceptually different from the others — pain-centric rather than automation-potential-centric. The spec's conceptual framing propagated all the way into the data schema.

This matters practically: if you're building on top of an existing system, or if multiple people are building different parts of the same system, field name divergence creates integration problems. If you need a specific domain model, you must name it explicitly.

### Finding 3: The engineer workflow is the hardest to get right

Experiments 02 and 03 both omitted MCP tools for session creation and activity submission. The entire engineer workflow was inaccessible to an agent. This didn't show up in the UI tests — the UI worked fine — but it made the MCP tests fail for the most basic operations.

The pattern: specs that describe what users do in the app don't naturally produce tools for what an agent needs to bootstrap that same workflow. The engineer flow (create session → share link → join → add activities) is usually described as "setup" in product specs. On the agent surface, it's not setup — it's the main entry point.

### Finding 4: Counterintuitive result on the problem statement

We expected the problem statement to underperform across the board. It didn't. It produced a more complete MCP than Experiments 02 and 03 — because without constraints, Claude thought about what the system needs to do rather than what users see. The skills it wrote were the most human-workflow-appropriate. Internal coherence (skills ↔ MCP) was perfect.

The downside wasn't quality — it was unpredictability. Claude invented its own data model, made its own product decisions, and missed specific UX moments that matter in practice (shareable URL). The output was internally consistent but externally arbitrary.

---

## Where we're going next

### Better specs first

The first-pass results showed that all four experiments needed follow-up work — none reached the ideal state in one shot. Before iterating, we're going back to the design phase.

We're designing the application more deliberately in a proper design tool, then using that artifact as the source of truth for a new set of specs. The question we're testing: does a well-designed visual spec — with explicit user flows, annotated screens, and a defined data model — produce meaningfully better first-pass results? And if we strip that spec down to different levels of detail for each experiment, does the hierarchy of information matter more than the format?

Each experiment will still vary in spec type, but now they'll all draw from the same design source. What varies is what we choose to include — not what the underlying design intends.

### Iterating to ideal state and tracking the cost

Once we have better specs, we'll iterate each experiment to its ideal state — fixing the gaps identified in first-pass findings — and track how many follow-up prompts each requires. This gives us the iteration cost curve: which spec type requires the least follow-up work to reach a production-ready result?

### Experiment 05: the codebase as source of truth

The most interesting question we want to test last: what if the codebase already exists? In most real teams, you're not starting from a spec — you're joining an existing system and trying to understand what it does. Can you extract a minimal spec from a working codebase, hand that spec back to a fresh Claude session, and get something close to the original?

This tests the "spec as documentation" use case — and it raises a practical question for teams maintaining AI-native systems: what's the minimum spec you need to describe a system that already exists?

---

## What this means for your team right now

We're not done. The iteration phase and Experiment 05 will sharpen these conclusions. But a few things are clear enough to act on now:

**If you need a working agent surface (MCP + skills) from a first-pass generation:** A technical PRD is the most reliable spec type. Describe your data model explicitly — field names, types, and the enum values for categorical fields. The MCP tools will reflect your vocabulary back to you.

**If UI quality is your primary concern:** A user-role spec produces the sharpest product thinking — the correct flows, the right moments, the transitions that make an app feel designed rather than generated.

**If you're resource-constrained and want the lowest-friction starting point:** A problem statement is more capable than it looks. You'll get a working first draft across all four surfaces. The risk is data model drift and product decisions you didn't make.

**The one thing every spec should include:** An explicit description of the engineer workflow — session creation, participant onboarding, the first action a new user takes. This is the surface that consistently falls off the agent surface when it's described only as setup.

---

*[Iteration findings, final scores, and Experiment 05 results to be added as the research completes.]*
