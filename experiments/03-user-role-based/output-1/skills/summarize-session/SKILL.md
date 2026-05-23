# Skill: Summarize Session

Summarize the output of a Toil Tracker work audit session into a concise, shareable brief.

## Trigger

Use this skill when the facilitator asks you to summarize a session, produce a recap, or share results with stakeholders who weren't in the meeting.

## Inputs

- `session_id` (required) — The Toil Tracker session ID.

## Steps

1. Call `get_session` with the session ID to retrieve all activities and metadata.
2. Compute counts:
   - Total activities
   - Breakdown by `automatable`: yes / maybe / no
   - Breakdown by `duration`: quick / medium / significant
   - Number of flagged activities
   - Number of activities with a priority set (high / medium / low)
3. Identify the top 5 automation candidates by calling `get_automation_candidates` with `limit: 5`.
4. Produce a plain-text summary with this structure:

```
## Work Audit Summary — {session title}

**Status:** {open | reviewing | closed}
**Participants:** {n}
**Total activities logged:** {n}

### Automation breakdown
- Strong candidates (automatable = yes): {n}
- Possible candidates (automatable = maybe): {n}
- Not automatable: {n}

### Effort breakdown
- Significant: {n}  |  Medium: {n}  |  Quick: {n}

### Top automation candidates
1. {title} — {duration}, {repetitive} repetitive, {enjoyment} enjoyment
2. …

### Prioritized items ({n} total)
- [High] {title}
- [Medium] {title}
- …
```

5. If no activities have been logged, respond: "The session has no activities yet. Share the engineer link and ask participants to add their recurring work."

## Output

Return the formatted summary as plain text. Do not wrap it in a code block unless the user asks for markdown.
