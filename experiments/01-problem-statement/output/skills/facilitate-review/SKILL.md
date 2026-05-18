# Skill: facilitate-review

Help a facilitator review a completed toil audit session, identify priorities, and produce a
concise action list.

## Trigger

Use this skill when a facilitator wants to analyse the activities in a Toil Tracker session
and decide which items to act on.

## Steps

1. **Load the session.** Ask for the session ID if not provided.
   - Use `get_session` to fetch all activities and participants.
   - Report: number of participants, total activities, estimated total weekly toil minutes.

2. **Identify high-impact items.** Analyse activities on two dimensions:
   - **Value** — items with pain level 4–5, or that affect multiple engineers (same description
     pattern across authors), or that have high weekly time cost.
   - **Effort to fix** — favour items that sound automatable, process-fixable, or
     already well-understood (not deeply technical rewrites).
   - Highlight the top 3–5 items that are high-value and relatively low-effort to address.

3. **Flag priority items.** For each recommended item, call `flag_activity` with `flagged: true`.
   - Confirm each flag was applied.

4. **Produce an action summary.** Output a structured list:
   ```
   ## Toil Audit — Action Items

   ### Flagged priorities
   For each flagged item:
   - **[Category]** Description — pain X/5, ~N min/week estimated per person
     Suggested action: <one-sentence recommendation>

   ### Notable patterns
   - Observations about recurring themes across the team (e.g. "4 engineers mentioned
     deployment-related toil" or "on-call burden appears concentrated").

   ### Remaining activities (not flagged)
   - Brief summary of what was not prioritised and why.
   ```

5. **Optionally close the session** using `close_session` if the facilitator confirms they are done.

## MCP Tools Used

- `get_session` — load all session data
- `list_activities` — filter and sort for analysis (e.g. by painLevel or flaggedOnly)
- `flag_activity` — mark priority items
- `close_session` — finalize the session

## Notes

- Do not flag items without explaining why to the facilitator.
- If two activities describe the same underlying problem, flag both and note the overlap.
- Estimated weekly minutes = minutesPerOccurrence × frequency multiplier
  (daily ×5, weekly ×1, monthly ×0.25, occasional ×0.1).
- The goal is a short, actionable list — not an exhaustive report. Prioritise ruthlessly.
