# Skill: Draft Backlog Items

Convert flagged session activities into ready-to-import backlog items for a planning tool (Linear, Jira, GitHub Issues, etc.).

## Trigger

Use this skill when the facilitator asks to create tickets, draft tasks, or generate backlog items from the session output.

Example prompts:
- "Draft backlog items from this session"
- "Create tickets for the flagged items"
- "Generate tasks I can paste into Linear"
- "Turn the priorities into actionable items"

## Steps

1. Call `draft_backlog_items` with the session ID.
2. Review the returned items. If no items are flagged, suggest the facilitator flag priorities first using `flag_activity` or by going back to the session UI.
3. Present the items in a clean markdown format the facilitator can copy directly.

## Output format

Each backlog item should include:
- A short title suitable for a ticket subject line
- Priority rank
- Weekly cost context
- Who reported it
- The team's verdict (automate / eliminate / handoff / keep)
- Clear acceptance criteria (3 bullet points max)

Do not invent information not present in the session data.
