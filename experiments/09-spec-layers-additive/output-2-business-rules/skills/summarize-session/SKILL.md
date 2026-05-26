# Skill: summarize-session

Summarize a Work Audit session into a plain-English paragraph plus a stats table.

## When to use

Use when the facilitator or a team member asks for a session overview — "what did we log?", "how much time is this costing us?", "where are we in the discussion?".

## Steps

1. Call `get_session` with the sessionId.
2. Call `list_activities` with no filters to get all activities.
3. Compute the following stats from the activities list:
   - **Total activities**: count
   - **Total effort**: sum of `effortHrsPerWk` across all activities (if not pre-computed, derive from tpo × freq using the standard table: `<30m=0.5, 30m-2h=1.25, half-day=4, day+=8` × `daily=5, weekly=1, monthly=0.23, quarterly=0.077, adhoc=0.3`)
   - **Energy breakdown**: count of energizing / neutral / draining activities
   - **Classification progress**: how many have `teamAuto !== 'unclassified'` out of total
   - **Flagged count**: how many have `flagged === true`
   - **Participants**: how many unique contributors

4. Write a summary paragraph in this format:
   > "The team submitted X activities totalling ~Yh/wk across Z engineers. [Energy sentence: e.g. 'N of those activities are reported as draining.']. [Classification status: e.g. 'X/Y have been classified during discussion so far.' or 'Discussion hasn't started yet.'] [Flagged sentence if any: e.g. 'N activities have been flagged as priorities.']"

5. Produce a stats table:

   | Stat | Value |
   |------|-------|
   | Total activities | X |
   | Total effort | ~Y h/wk |
   | Draining | N (X%) |
   | Neutral | N (X%) |
   | Energizing | N (X%) |
   | Classified | N / total |
   | Flagged priorities | N |
   | Contributors | N |

## Constraints

- Do not classify, flag, or modify any activities.
- Do not make recommendations in this skill — that's for `find-best-opportunities`.
- Keep the summary to one paragraph. Do not produce bullet lists or headers in the paragraph.
