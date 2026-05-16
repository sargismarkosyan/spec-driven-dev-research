# Spec: User Role Based Action

> Behavioral spec: who the users are, what they do, and the approach taken to solve the problem.

---

## Context

Engineering teams do periodic retrospectives, but standard retro formats (Start/Stop/Continue, 4Ls) don't address the underlying question: *what work are we doing, and should we still be doing it that way?*

This tool is built for a specific retro format: the **work audit**. It replaces one retrospective session per quarter. The facilitator runs the session; engineers participate in real time.

## Users and Their Goals

### Engineer
The engineer is at the core of this tool. This is the person whose work is being reviewed.

- Wants to improve their own work process — not just vent, but actually change things
- Needs to capture what they know about their recurring activities honestly and quickly
- Trusts that the system will surface improvement opportunities they might not have articulated themselves
- Doesn't want overhead — submitting should be fast, the tool should stay out of the way
- Wants to see what colleagues are doing (transparency, not surveillance)

### Facilitator
The facilitator runs the session and owns the outcome.

- Wants to spotlight what is **low effort to fix or automate** and **high value to the team** — that intersection is the priority
- Needs to quickly scan across the team's activities and identify where to focus improvement energy
- Doesn't want to read everything — needs aggregation and filtering that surfaces the right things
- Takes the session output and turns it into concrete next steps: flagged items, a prioritized list, backlog entries

## The Flow

1. Facilitator creates a session and shares the link in the meeting
2. Engineers join (no login) and spend ~10 minutes listing their recurring activities
3. For each activity, they answer four quick questions:
   - How long does this take? (quick / medium / significant)
   - Do you enjoy it? (yes / meh / no)
   - Is it repetitive? (yes / sometimes / no)
   - Could it be automated or replaced by a tool? (yes / maybe / no)
4. Facilitator switches to the results view — all activities visible, grouped by automation potential
5. Team discusses; facilitator flags the low-effort high-value items
6. Facilitator exports the prioritized list

## What Makes This Different

- No login required for engineers — friction must be near zero
- The four-question tagging model is fixed — not configurable — to keep sessions focused
- The facilitator has a separate view with aggregation and filtering; engineers see a simple card board
- This is a single-session tool — no ongoing project management, no account history

## On MCP and Skills

The MCP server and AI skills are not for AI agents as end users. They are for **engineers and facilitators using AI assistants** — a human behind the agent who wants to get more out of session data without switching tools. For example: a facilitator asking their AI assistant to summarize the session, identify the top automation candidates, or draft a backlog — with the assistant using MCP to query the session and skills to structure the output.

## Deliverables

The application has four outputs:
1. **Web UI** — two distinct views (engineer activity board, facilitator results view)
2. **REST API** — the backend the UI talks to
3. **MCP Server** — exposes session operations so AI assistants can act on behalf of engineers and facilitators
4. **AI Skills** — pre-built workflows for post-session actions: summarize, identify low-effort high-value items, draft backlog
