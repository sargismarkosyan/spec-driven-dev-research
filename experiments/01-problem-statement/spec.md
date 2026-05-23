# Spec: Problem Statement Only

> This is the spec we give Claude. Nothing more.

---

Engineering teams accumulate repetitive, manual work over time but rarely stop to examine it. There is no established practice for auditing what engineers actually do day-to-day — which means improvement opportunities go unnoticed, toil compounds, and the team keeps doing work that could be automated, eliminated, or handed off.

Two people experience this problem differently.

**The engineer** is closest to the work. They know which of their daily activities are draining, repetitive, or feel like a waste of time — but that knowledge stays in their head. There is no structured way to surface it, and no forcing function to make it visible to the rest of the team. Engineers want to improve their own work process but need a way to capture and communicate what they know — honestly, quickly, without it turning into a complaint session.

**The facilitator** is responsible for turning that knowledge into action. They need to look across everything the team does and identify what is worth fixing — specifically the work that drains the team the most and costs the most time each week. That intersection — draining and expensive — is where the improvement energy should go. Without a structured view of the team's work, identifying it is guesswork. The facilitator also needs to be able to run the prioritization conversation in the room, not just before or after it.

## What the session looks like

The tool is designed around a single 60–90 minute session that replaces one quarterly retrospective. The facilitator creates a session and shares a join link with the team in the meeting. Engineers join without accounts — just a name — and spend roughly ten minutes logging their recurring work activities. They tag each activity with a few structured attributes: how long it takes, how often they do it, and whether it energizes or drains them. While they submit, the team feed is visible to everyone — seeing what colleagues are logging helps engineers remember things they might otherwise forget.

Once submissions close, the facilitator drives a discussion. The team walks through the activities together and, for each one, decides collaboratively whether it's something that could be automated or removed. This verdict is deliberately a team decision — individuals can't reliably assess automation potential in isolation. An engineer closest to a task may not know what's technically feasible, and assessments are often skewed by proximity to the work. The collective judgment, made in the room with full context, is more accurate than any self-report. The facilitator flags the highest-priority items as the discussion happens. At the end, the output is a short prioritized list — the team's clearest picture of what to work on next.

## What the facilitator needs

The facilitator needs more than a list of activities. They need a view that surfaces the signal without requiring them to read everything. The right view places activities by how much they drain the team against how much time they consume per week — that 2×2 gives the facilitator an immediate sense of where to focus. Activities that are both draining and expensive are the top-right quadrant: these are the first candidates for fixing, automating, or removing.

The facilitator also needs to be able to clean up the board as the session runs. When two engineers log near-identical activities, those should be mergeable into one card that shows combined authorship and combined time cost — a merged entry is actually a stronger signal, not a weaker one. And the facilitator should be able to correct typos, remove irrelevant cards, or edit anything that needs clarification without interrupting the discussion.

## The output

The session ends with a prioritized list of flagged activities. That list should be exportable in a format that can be dropped directly into a team document or planning tool. The facilitator should also be able to query session data through an AI assistant — asking for a summary, requesting the top automation candidates, or generating draft backlog items — without having to copy-paste anything out of the tool.

## What to build

Build the full application as four outputs:

1. **Web UI** — the interface engineers and facilitators use during the session
2. **Backend API** — the server that stores session state and handles real-time updates
3. **MCP server** — exposes the application's operations to AI agents so facilitators can query and act on session data through their AI assistant
4. **AI skills** — pre-built workflows that a facilitator's AI assistant can invoke: summarizing the session, identifying the highest-value candidates for automation, and drafting backlog items from the prioritized output
