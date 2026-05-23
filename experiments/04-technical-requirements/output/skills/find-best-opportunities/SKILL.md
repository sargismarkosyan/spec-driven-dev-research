# find-best-opportunities

Identify the highest-value automation opportunities in a Toil Tracker session: draining activities with high effort and team-confirmed automatability.

## Steps

1. Ask the user for the **sessionId** if not already provided.

2. Call `list_activities` filtered to `energy=draining` and sorted by `sortBy=effort` (descending).

3. Also note which of those activities have `teamAuto === 'unclassified'` — these need team discussion before scoring.

4. Score each activity using:
   ```
   score = effortHrsPerWk × multiplier
   where multiplier = teamAuto === 'yes'  → 3
                      teamAuto === 'maybe' → 1.5
                      teamAuto === 'no'   → 0
                      teamAuto === 'unclassified' → N/A (tag separately)
   ```

5. Return a **ranked list of top 5 scored activities**, each with:
   - Title
   - Contributor(s) (look up names from the session participants)
   - Effort (~h/wk)
   - Automatability verdict (`teamAuto`)
   - Score
   - One-sentence rationale (e.g. "~4h/wk draining chore the team has confirmed is automatable")

6. List any **unclassified draining activities** separately as "needs team discussion" — do not score them.

7. If the facilitator wants to flag any of the top opportunities, ask for explicit confirmation before calling `flag_activity`.

## Constraints

- **Do not call `classify_activity`** — classification is a team decision made during the session, not by the AI.
- If the session has no draining activities yet, say so and suggest waiting for more submissions.
- Keep the rationale factual; do not editorialize about whether the team *should* automate something.
