# Skill: Summarize Session

Summarize the results of a Toil Tracker session for the facilitator.

## Trigger

Use this skill when the facilitator asks to summarize the session, see overall results, or get a recap.

## Steps

1. Call the MCP tool `summarize_session` with the current `sessionId`.
2. Format the returned data into a human-readable summary including:
   - Session name and participant count
   - Total activities logged and total effort (h/wk)
   - Energy breakdown (how many drain vs. energize)
   - Classification progress (classified / total)
   - Top 5 activities by weekly effort
3. Close with a one-sentence callout: "Automatability was classified by the team during discussion — not self-reported by engineers."

## Constraints

- Do not classify or flag activities. Surface data only.
- Keep the summary concise — bullet points preferred over prose.
