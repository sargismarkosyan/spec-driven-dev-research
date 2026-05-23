---
name: draft-backlog
description: Turn flagged session activities into a structured backlog draft, ready for the facilitator to review and paste into their planning tool.
---

## Instructions

Use this skill when the facilitator asks to turn session output into backlog items, action items, or tickets.

**Steps:**

1. Call `export_session` to get the full flagged activity list with effort data, verdicts, and facilitator notes.

2. For each flagged activity, draft a backlog item with the following fields:

   ```
   Title: [activity title]
   Type: [Automation | Process improvement | Remove / stop doing | Investigate]
   Priority: [P1 / P2 / P3]
   Author(s): [names of engineers who submitted this]
   Effort signal: [time per occurrence] × [frequency] ≈ [weekly hours] hrs/week
   Energy: [energizes / neutral / drains]
   Team verdict: [yes / maybe / no / not discussed]
   Facilitator note: [facilitator's note, or "—"]
   Description: [one sentence describing what needs to happen]
   ```

3. Assign Type based on verdict and quadrant:
   - verdict "yes" → Automation
   - verdict "maybe" + draining → Process improvement or Automation (flag as TBD)
   - PRIORITY quadrant + verdict "no" → Remove / stop doing (team said no to automation, but it's still draining and expensive)
   - everything else → Investigate

4. Assign Priority:
   - PRIORITY quadrant + verdict "yes" → P1
   - PRIORITY quadrant + other → P2
   - other quadrants + flagged → P3

5. Write the Description field as a single sentence starting with a verb: "Automate X", "Reduce frequency of Y by Z", "Decide whether to stop doing X", "Investigate whether X can be delegated or batched."

6. After presenting the draft, ask:
   - "Does the type assignment look right for each item?"
   - "Any items to add, remove, or reprioritize?"

   Do not finalize or post anything until the facilitator confirms. This draft is for their review.

**Output format:**
Present as a numbered markdown list, one item per flagged activity. Use the fields above as a consistent template so the facilitator can paste directly into Linear, Jira, Notion, or their planning tool of choice.
