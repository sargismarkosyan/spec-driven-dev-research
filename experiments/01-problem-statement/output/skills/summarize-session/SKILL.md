# Skill: Summarize Session

Summarize a Toil Tracker session for the facilitator: participant count, total toil logged, top draining activities, and prioritized items.

## Trigger

Use this skill when the facilitator asks for a summary, overview, or recap of the session.

Example prompts:
- "Summarize this session"
- "What did the team log?"
- "Give me an overview of the session"

## Steps

1. Call `list_sessions` to find available sessions, or use the session ID the facilitator provides.
2. Call `get_session_summary` with the session ID.
3. Present the summary in a concise, readable format. Highlight:
   - Total weekly minutes of toil identified
   - Number of draining vs energizing activities
   - Top 3 drains by weekly time cost
   - Flagged priority items (if any)

## Output format

Present as a short briefing the facilitator can share with stakeholders. Use plain language, not JSON.
