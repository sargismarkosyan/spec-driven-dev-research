# Skill: summarize-session

**File location in project:** `skills/summarize-session/SKILL.md`

**Purpose:** Produce a plain-English summary of a session's current state, paired with a statistics table showing effort totals, energy breakdown, classification progress, and contributor count.

**When to use:** When a facilitator or team member asks for a session overview — "what did we log?", "how much time is this costing us?", "where are we in the discussion?"

This skill is read-only. It must not set any flags, classifications, discussion notes, or any other field on any activity or session record.

---

## Required Steps

### Step 1 — Fetch session metadata

Call the `get_session` MCP tool with the provided `sessionId`. This returns the session object including participants and all activities. Activities are returned as-is — no `effortHrsPerWk` field is pre-computed by the tool.

### Step 2 — Fetch all activities

Call the `list_activities` MCP tool with the `sessionId` and no filter (defaults to `"all"`). This returns the complete activity list.

### Step 3 — Compute statistics

Compute the following values from the fetched data. For any activity, compute `effortHrsPerWk` using the formula:

> `effortHrsPerWk = TPO_HOURS[tpo] × FREQ_PER_WK[freq]`

Where:
- TPO_HOURS: `<30m → 0.5`, `30m-2h → 1.25`, `half-day → 4`, `day+ → 8`
- FREQ_PER_WK: `daily → 5`, `weekly → 1`, `monthly → 0.23`, `quarterly → 0.077`, `adhoc → 0.3`

Compute:

- **Total activities:** Count of all activity records
- **Total effort:** Sum of `effortHrsPerWk` across all activities, displayed as "~Yh/wk"
- **Energy breakdown:** Count and percentage of `draining`, `tedious`, `fine`, and `energizing` activities
- **Classification progress:** Count of activities where `teamAuto !== 'unclassified'` out of total
- **Flagged count:** Count of activities where `flagged === true`
- **Contributors:** Count of unique `participantName` values

### Step 4 — Compose the summary paragraph

Write one paragraph in this format:

> "The team submitted X activities totalling ~Yh/wk across Z engineers. [Energy sentence — e.g. 'N of those activities are reported as draining.']. [Classification status — e.g. 'X/Y have been classified during discussion so far.' or 'Discussion hasn't started yet.']. [Flagged sentence if N > 0 — e.g. 'N activities have been flagged as priorities.']"

Do not make recommendations in this paragraph.

### Step 5 — Compose the statistics table

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

---

## Output Format

Return the summary paragraph followed by the statistics table. No additional commentary, recommendations, or verdicts.

---

## Constraints

- Must not classify, flag, or modify any activities.
- Must not make recommendations — that is for the `find-best-opportunities` skill.
- Keep the summary to one paragraph; no bullet lists or headers within the paragraph.
