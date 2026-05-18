# find-best-opportunities

Identifies the highest-value automation opportunities from a Toil Tracker session. Filters for activities that are automatable and significant in time or repetitiveness, then ranks them by combined impact and returns a facilitator-ready shortlist with rationale.

## When to use

After submission closes, use this skill to surface the best candidates for automation investment before the team prioritization discussion.

## Inputs

- `sessionId` — the session ID to analyze

## Scoring model

Each activity gets a numeric impact score (0–6):

| Field | Value | Points |
|---|---|---|
| `automatable` | `yes` | 3 |
| `automatable` | `maybe` | 1 |
| `timeEstimate` | `significant` | 2 |
| `timeEstimate` | `medium` | 1 |
| `repetitive` | `yes` | 1 |
| `repetitive` | `sometimes` | 0.5 |
| `enjoyment` | `no` | +0.5 (bonus — unpleasant toil is higher priority) |

Only include activities where `automatable` is `yes` or `maybe` AND the combined score is ≥ 3.

## Steps

1. Call `get_session` with the provided `sessionId`.
   - If not found, stop and report the error.

2. Call `list_activities` with `sessionId` (no filter) to get all activities.

3. For each activity, compute the impact score using the table above.

4. Filter to activities where `automatable` is `yes` or `maybe` and score ≥ 3.

5. Sort descending by score. Break ties by putting `automatable = yes` before `maybe`, then `significant` time before `medium`.

6. Return a ranked shortlist. For each item include:
   - **Rank** (1-based)
   - **Title**
   - **Submitted by** (participant name from session data)
   - **Score** (numeric)
   - **Rationale** — one sentence explaining why it ranked here, referencing the specific field values (e.g., "Automatable, takes significant time, and is repetitive — prime candidate for scripting.")

7. After the list, add a one-paragraph **Summary** noting the total count of candidates found and any patterns (e.g., multiple people flagging similar activities).

Limit the shortlist to a maximum of 10 items.

## Example invocation

```
/find-best-opportunities sessionId=abc123
```
