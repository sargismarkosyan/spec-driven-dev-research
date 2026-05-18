# summarize-session

Summarizes a Toil Tracker session in plain English: what the team does, how many activities were submitted, and a breakdown by automation potential.

## When to use

After a session's submission phase ends (status `reviewing` or `closed`), use this skill to give the facilitator a quick overview before the team discussion.

## Inputs

- `sessionId` — the session ID to summarize

## Steps

1. Call `get_session` with the provided `sessionId`.
   - If the session is not found, stop and report the error.

2. Call `list_activities` with the same `sessionId` and no filter (to get all activities).

3. Compute counts:
   - Total activities
   - Automatable `yes` / `maybe` / `no`
   - Flagged by facilitator
   - Time estimate breakdown: `quick` / `medium` / `significant`
   - Enjoyment breakdown: `yes` / `meh` / `no`
   - Repetitive breakdown: `yes` / `sometimes` / `no`

4. Identify the participants by name from the session data.

5. Return a plain-English summary with the following sections:

   **Session:** `<name>` — `<N>` participants, `<N>` activities, status `<status>`

   **Participants:** comma-separated list of names.

   **Automation potential:**
   - `<N>` activities could be automated (automatable = yes)
   - `<N>` might be automatable (automatable = maybe)
   - `<N>` are unlikely to be automated (automatable = no)

   **Time burden:** `<N>` quick, `<N>` medium, `<N>` significant activities.

   **Enjoyment:** `<N>` enjoyed, `<N>` neutral, `<N>` disliked.

   **Repetitiveness:** `<N>` repetitive, `<N>` sometimes repetitive, `<N>` not repetitive.

   **Flagged by facilitator:** `<N>` activities starred for discussion.

   Keep the summary factual and under 200 words. Do not editorialize.

## Example invocation

```
/summarize-session sessionId=abc123
```
