# Skill: Prioritize Automation Candidates

Identify and rank the best automation targets from a Toil Tracker session, with a brief justification for each.

## Trigger

Use this skill when the facilitator asks which activities to automate first, wants the top ROI targets, or is preparing for a planning discussion.

## Inputs

- `session_id` (required) — The Toil Tracker session ID.
- `top_n` (optional, default 5) — How many candidates to return.

## Scoring model

Each activity has an implicit automation ROI score:

| Signal | Weight |
|--------|--------|
| `automatable = yes` | +3 |
| `automatable = maybe` | +2 |
| `repetitive = yes` | +2 |
| `repetitive = sometimes` | +1 |
| `duration = significant` | +2 |
| `duration = medium` | +1 |
| `enjoyment = no` | +1 (bonus: removal would reduce toil) |

The server's `get_automation_candidates` tool applies this scoring. Use it.

## Steps

1. Call `get_automation_candidates` with `session_id` and `limit: {top_n}`.
2. For each candidate, produce a one-sentence justification that references the signals:
   - Mention duration (how costly each occurrence is)
   - Mention repetitiveness (how often it happens)
   - Mention whether it's fun or painful (`enjoyment = no` is a signal the team wants it gone)
3. If the facilitator hasn't set priorities yet, offer to call `set_priority` for the top items. Ask before setting anything.
4. Return the ranked list with justifications.

## Output format

```
### Top {n} automation candidates — {session title}

1. **{title}** (score: {n})
   {one-sentence justification}

2. …
```

If fewer than `top_n` activities exist, return all of them and note the count.

## Guardrails

- Do not set priorities without the facilitator's explicit confirmation.
- Do not recommend activities marked `automatable = no` unless no other candidates exist.
