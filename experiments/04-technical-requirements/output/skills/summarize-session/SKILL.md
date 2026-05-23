# summarize-session

Summarize a Toil Tracker work audit session: total activities, effort distribution, energy breakdown, classification progress, and flagged priorities.

## Steps

1. Ask the user for the **sessionId** if not already provided.

2. Call `get_session` with the sessionId to retrieve the session metadata, participant list, and all activities.

3. Call `list_activities` with no filters to get the full activity list including `effortHrsPerWk` for each.

4. Compute the following statistics:
   - **Total activities**: count of all activities
   - **Total participants**: count of unique participants
   - **Total effort**: sum of `effortHrsPerWk` across all activities (round to 1 decimal)
   - **Effort distribution**: count and sum of effort per `tpo` bucket (`<30m`, `30m-2h`, `half-day`, `day+`)
   - **Energy breakdown**: count per energy level (`energizing`, `neutral`, `draining`)
   - **Classification progress**: count of activities where `teamAuto !== 'unclassified'`, expressed as X/Total (Y%)
   - **Flagged count**: count where `flaggedByFacilitator === true`

5. Return:
   - A **plain-English paragraph** in this form:
     > "The team submitted {total} activities totalling ~{totalEffort}h/wk across {participants} people. {Energy sentence: e.g. 'X activities were flagged as draining, making up Y% of total effort.'} {Classification sentence: e.g. 'Classification is X% complete with Y activities still unclassified.'}  {Flag sentence if any flagged.}"
   - A **stats table** (Markdown) with the computed values.

## Constraints

- Do **not** set any flags or classifications — this is a read-only operation.
- If no activities have been submitted yet, say so and suggest the facilitator wait for submissions.
