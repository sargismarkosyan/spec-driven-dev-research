# Skill: draft-backlog

Convert flagged Work Audit activities into ready-to-paste backlog items.

## When to use

Use when the facilitator asks "draft the backlog items", "turn the flagged activities into tickets", or "create action items from the session output". Use after discussion is complete and priorities have been flagged.

## Steps

1. Call `list_activities` filtered to `flagged=true`. If no flagged activities are returned, tell the facilitator and stop.

2. For each flagged activity, draft one backlog item using this template:

   ---
   **[Action-oriented title]**
   e.g. "Automate Sentry alert triage" / "Remove manual DB backup step" / "Investigate SSL cert renewal process"

   - **Recurring cost**: ~Xh/wk (from tpo × freq)
   - **Contributors**: who reported it (names from the session)
   - **Team verdict**: automatable / maybe automatable / manual work to remove
   - **Energy signal**: drains the team / neutral
   - **Acceptance criteria** (one Given/When/Then stub):
     - Given [current state]
     - When [change is made]
     - Then [team no longer needs to do X manually / time cost drops to <Y]
   - **Size estimate**: S (<1h/wk saved) · M (1–3h/wk) · L (3h+/wk)
   - **Discussion note**: [paste discussion note if present, otherwise omit]
   ---

3. After drafting all items, ask the facilitator which format they want:
   - **Linear**: markdown ready to paste into Linear's create-issue dialog
   - **Jira**: plain text suitable for bulk import
   - **GitHub Issues**: markdown body with checkboxes for acceptance criteria
   - **Plain Markdown**: the default template above

4. Reformat all items in the chosen format and return them.

## Constraints

- Do not invent acceptance criteria that aren't supported by the session data. If you don't know the current state, use a placeholder like "[describe current manual step]".
- Keep titles action-oriented: start with "Automate", "Remove", "Reduce", "Investigate", or "Replace".
- Do not include activities that aren't flagged. If the facilitator wants all classified activities, they should ask explicitly.
- Size estimates are based on recurring cost (effort saved), not implementation effort.
