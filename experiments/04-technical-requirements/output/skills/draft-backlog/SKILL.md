# draft-backlog

Draft ready-to-paste backlog items from flagged Toil Tracker activities.

## Steps

1. Ask the user for the **sessionId** if not already provided.

2. Call `list_activities` with `flagged=true` to get all facilitator-flagged activities.

3. If no flagged activities, tell the user and stop. Do not guess which activities to include.

4. For each flagged activity, draft a backlog item:

   **Title**: Action-oriented — choose the verb based on automatability:
   - `teamAuto === 'yes'`   → "Automate [title]"
   - `teamAuto === 'maybe'` → "Investigate automating [title]"
   - `teamAuto === 'no'`    → "Reduce [title]"
   - `unclassified`         → "Review [title]"

   **Effort**: `~Xh/wk currently (recurring cost)`

   **Contributors**: names of all contributing participants (use `contributorIds` → look up names via session data)

   **Size estimate** (based on `effortHrsPerWk`):
   - `< 1h/wk` → S
   - `1–3h/wk` → M
   - `3h+/wk`  → L

   **Acceptance criteria** (one Given/When/Then stub):
   - For "Automate" items: "Given [the recurring trigger], when [the automation runs], then [the manual step is eliminated and time is saved]."
   - For "Investigate" items: "Given [the activity], when [a discovery spike is complete], then [we have a recommendation on automation feasibility]."
   - For "Reduce/Review" items: "Given [the current process], when [the improvement is shipped], then [the recurring cost is reduced or eliminated]."

5. Ask the user which **format** to use:
   - **Linear** — Markdown with metadata as properties
   - **Jira** — Markdown with labels and story-point field
   - **GitHub Issues** — Markdown with front matter labels
   - **Plain Markdown** — fenced Markdown, ready to paste anywhere

6. Return formatted items ready to paste. Include a callout at the top:
   > ⚠️ Automatability was classified by the team during discussion — not self-reported.

## Constraints

- Only include activities with `flaggedByFacilitator === true`. Do not add unflagged activities even if they seem like good candidates.
- Do not call `flag_activity` or `classify_activity` — both are facilitator decisions.
- Keep acceptance criteria stubs short; they are starting points, not final tickets.
