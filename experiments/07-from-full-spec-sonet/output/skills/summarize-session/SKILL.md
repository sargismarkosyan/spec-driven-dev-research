---
name: summarize-session
description: Summarize a Work Audit session — get_session + list_activities, compute stats, produce one paragraph + table. Read-only.
---

# Summarize Session

Produce a concise summary of a Work Audit session for the facilitator.

## Steps

1. Call `get_session` with the session ID to retrieve session metadata and participant list.
2. Call `list_activities` with filter `all` to retrieve all activities.
3. Compute:
   - Total activities
   - Total effort: sum of `effortHrsPerWk` across all activities (display as "~Yh/wk")
   - Energy breakdown: count and percentage of `draining`, `tedious`, `fine`, `energizing`
   - Classification progress: count of activities where `teamAuto !== 'unclassified'` out of total
   - Flagged count: activities where `flagged === true`
   - Contributors: count of unique `participantName` values
4. Write a **one-paragraph summary** covering: what the team does, dominant energy levels, effort distribution, and classification status. Do not make recommendations.
5. Write a **statistics table**:

| Stat | Value |
|---|---|
| Total activities | X |
| Total effort | ~Y h/wk |
| Draining | N (X%) |
| Tedious | N (X%) |
| Fine | N (X%) |
| Energizing | N (X%) |
| Classified | N / total |
| Flagged priorities | N |
| Contributors | N |

## Reference values

`effortHrsPerWk = TPO_HOURS[tpo] × FREQ_PER_WK[freq]`

- TPO_HOURS: `<30m → 0.5`, `30m-2h → 1.25`, `half-day → 4`, `day+ → 8`
- FREQ_PER_WK: `daily → 5`, `weekly → 1`, `monthly → 0.23`, `quarterly → 0.077`, `adhoc → 0.3`

## Notes

- Read-only skill — do NOT call any write APIs.
- Must not classify, flag, or modify any activities.
- Must not make recommendations — that is for the `find-best-opportunities` skill.
- Keep the summary to one paragraph; no bullet lists or headers within the paragraph.
- Present results in plain markdown suitable for sharing with stakeholders.
