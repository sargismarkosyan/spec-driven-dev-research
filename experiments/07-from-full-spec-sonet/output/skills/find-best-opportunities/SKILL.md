---
name: find-best-opportunities
description: Score and rank the top 5 automation opportunities from a Work Audit session. Human gate before flagging.
---

# Find Best Automation Opportunities

Identify the top 5 activities most worth automating from a Work Audit session.

## Steps

1. Call `get_session` with the session ID to confirm the session exists and check its current status.
2. Call `list_activities` with filter `draining` to retrieve all draining activities.
3. Call `list_activities` with filter `automatable` to retrieve all activities where `teamAuto === 'yes'`.
4. Combine and deduplicate results from steps 2 and 3 by activity ID.
5. Compute score for each activity using the formula below.
6. Sort descending by score. Select the top 5.
7. Present the ranked list (see Output Format).
8. Add a separate "Needs team discussion" section listing unclassified draining activities with high effort (without scores).
9. **Human gate:** End with: "Would you like me to flag any of these as priorities? I'll wait for your confirmation before making any changes."

## Score Formula

```
effortHrsPerWk = TPO_HOURS[tpo] × FREQ_PER_WK[freq]

score = effortHrsPerWk × teamAuto_multiplier × energy_bonus

teamAuto_multiplier:
  yes          → 3.0
  maybe        → 1.5
  no           → 0.2
  unclassified → 1.0

energy_bonus: 1.5 if energy === 'draining', 1.0 otherwise
```

Reference values:
- TPO_HOURS: `<30m → 0.5`, `30m-2h → 1.25`, `half-day → 4`, `day+ → 8`
- FREQ_PER_WK: `daily → 5`, `weekly → 1`, `monthly → 0.23`, `quarterly → 0.077`, `adhoc → 0.3`

## Output Format

For each of the top 5, present:
- **Title:** The activity's title
- **Contributor(s):** Participant name(s)
- **Effort:** `~Xh/wk`
- **Energy:** draining / tedious / fine / energizing
- **Team verdict:** automatable / maybe automatable / manual work to remove / not yet classified
- **Rationale:** One sentence explaining why it ranks highly (based on effort and verdict only)

## Confirmation Requirement Before Flagging

When the facilitator confirms they want specific activities flagged:
1. List the specific activities to be flagged.
2. Wait for explicit facilitator confirmation.
3. Only after confirmation: inform the facilitator to flag via the UI, or describe the REST endpoint call needed (`POST /api/sessions/{id}/activities/{actId}/flag` with facilitator token). The MCP server is read-only and cannot flag activities directly.

## Notes

- Advisory skill — always get human confirmation before any changes.
- Must not classify any activity. Classification is a team decision made during the live session.
- Must not flag activities without facilitator confirmation.
- If most activities are unclassified, note that scores are preliminary.
- Do not recommend removing energizing work just because it is high effort — surface it and mark it as "strategic — protect, don't remove."
- Scoring uses only `effortHrsPerWk`, `teamAuto`, and `energy` — do not introduce additional scoring factors.
