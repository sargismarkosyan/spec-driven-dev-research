# Skill: Draft Backlog from Flagged Output

Generate draft backlog items from the flagged activities in a Toil Tracker session.

## Trigger

Use this skill when the facilitator asks to draft tickets, create backlog items, or turn flagged items into stories.

## Steps

1. Call the MCP tool `draft_backlog` with the current `sessionId`.
2. Format each returned item as a draft ticket:
   ```
   **[Automate] {title}**
   Reporter: {contributor}
   Effort saved: ~{h}/wk
   Verdict: {verdict}
   Notes: {discussion notes if present}
   ```
3. Present all drafts and ask: "Which of these would you like to create as real tickets? I can format them for Jira, Linear, or another tracker."
4. Wait for facilitator to select and confirm before producing final output.

## Constraints

- Do not create tickets in any external system without explicit facilitator approval.
- Always include the disclaimer at the end: "Automatability was classified by the team during discussion — not self-reported by engineers."
- If no activities are flagged, inform the facilitator and suggest using the discussion mode to flag items first.
