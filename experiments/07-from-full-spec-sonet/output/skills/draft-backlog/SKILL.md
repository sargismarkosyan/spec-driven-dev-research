---
name: draft-backlog
description: Draft backlog tickets from flagged Work Audit activities. Ask for format (Linear/Jira/GitHub/plain) before outputting.
---

# Draft Backlog

Turn flagged Work Audit activities into actionable backlog items.

## Steps

1. Call `list_activities` with filter `flagged` to retrieve all flagged activities.
   - If the result is empty (no flagged activities), inform the facilitator and stop — do not proceed to drafting.
2. For each flagged activity, draft a backlog item with:
   - **Title:** Action-oriented rewrite based on `teamAuto` verdict:
     - `yes` → "Automate [activity]"
     - `maybe` → "Investigate automating [activity]"
     - `no` → "Remove [activity]" or "Streamline [activity]"
     - `unclassified` → "Investigate [activity]"
   - **Effort note:** "approximately X h/wk currently (this is the recurring cost, not the automation implementation cost)"
   - **Contributors:** Names of all participants who reported this activity (all names from `reportedBy` for merged activities)
   - **Acceptance criteria stub** (Given/When/Then):
     - Given: the current manual/recurring work situation
     - When: the solution is implemented
     - Then: expected outcome (time saved, process eliminated, or work automated)
   - **Size estimate** based on `effortHrsPerWk`:
     - `< 1 h/wk` → S (Small)
     - `1–3 h/wk` → M (Medium)
     - `≥ 3 h/wk` → L (Large)
   - **Labels:** `work-audit`, energy level, teamAuto verdict
3. Ask: "Which format do you want? Linear / Jira / GitHub Issues / Plain markdown"
4. Format all items in the chosen format and present for review.

## Reference values

`effortHrsPerWk = TPO_HOURS[tpo] × FREQ_PER_WK[freq]`

- TPO_HOURS: `<30m → 0.5`, `30m-2h → 1.25`, `half-day → 4`, `day+ → 8`
- FREQ_PER_WK: `daily → 5`, `weekly → 1`, `monthly → 0.23`, `quarterly → 0.077`, `adhoc → 0.3`

## Notes

- Only flagged activities — ignore non-flagged items.
- Use session name as the Epic/initiative label where applicable.
- Do NOT create tickets automatically — present for review first.
- The skill does not submit backlog items to any external tool. It produces text output only.
- Must not modify any activity data in the Work Audit session.
- Must not add, remove, or change flags — it works with the flagged set as it exists at invocation time.
- Size estimates are based solely on `effortHrsPerWk` and must not be adjusted based on subjective assessment.
- Must ask for format in Step 3 and must not assume a default format without asking.
