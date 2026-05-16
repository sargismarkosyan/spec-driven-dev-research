# Spec: PM Requirements (High-Level)

> User stories and acceptance criteria only. No technical detail.

---

## Users

- **Engineer** — the person whose work is being reviewed; wants to improve their own work process
- **Facilitator** — runs the session; wants to surface what is low effort to fix and high value to the team

## User Stories

- As an engineer, I can add my daily work activities to a shared board so the team can see what everyone is doing.
- As an engineer, I can tag each activity with attributes: how much time it takes, whether I enjoy it, whether it feels repetitive, and whether I think it could be automated.
- As a facilitator, I can see all activities across the team in one view and filter by attribute.
- As a facilitator, I can flag activities that appear low effort to fix and high value — and export that list.
- As a team, we can run this as a live session — everyone submits at the same time and we discuss the results together.
- As a facilitator using an AI assistant, I can query session data through MCP to get summaries and recommendations without leaving my AI tool.
- As a facilitator, I can use pre-built AI skills to summarize session results, identify the highest-value automation opportunities, and draft a backlog from the output.

## Acceptance Criteria

- A new session can be created with a name and shared via link.
- Engineers join the session and add activities without needing an account.
- Each activity has: title, time estimate (quick / medium / significant), enjoyment (yes / meh / no), repetitiveness (yes / sometimes / no), automation potential (yes / maybe / no).
- The facilitator view shows activities grouped by automation potential, with the ability to flag individual ones.
- Session data persists for at least the duration of the session.
- The application exposes an MCP server so a facilitator's AI assistant can query and act on session data programmatically.
- The application ships with AI skills for: summarizing session results, identifying low-effort high-value automation candidates, and drafting a backlog from the prioritized output.
