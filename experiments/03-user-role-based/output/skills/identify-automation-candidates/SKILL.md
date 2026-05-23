---
name: identify-automation-candidates
description: Surface the activities most worth automating based on effort, energy drain, and team verdict — and ask the facilitator to confirm before doing anything.
---

## Instructions

Use this skill when a facilitator asks "what should we automate first?" or "which activities are the best automation candidates?"

**Steps:**

1. Call `get_priority_matrix` for the session. Focus on the PRIORITY quadrant (draining + high effort). Also look at TOLERABLE (draining + low effort) as secondary candidates.

2. Call `list_activities` filtered to `automatability: "yes"` — these are activities the team already decided are automatable.

3. Call `list_activities` filtered to `automatability: "maybe"` — these are open questions.

4. Rank candidates using this logic (do NOT make autonomous judgments — present ranked candidates for the facilitator to evaluate):
   - Tier 1: PRIORITY quadrant + verdict "yes" — automate first
   - Tier 2: PRIORITY quadrant + verdict "maybe" — discuss further
   - Tier 3: TOLERABLE quadrant + verdict "yes" — lower effort but still draining
   - Tier 4: PRIORITY quadrant + verdict "no" — draining and high effort, but team decided not to automate; surface for discussion about whether to remove or reduce instead

5. Present the ranked list to the facilitator. For each candidate include:
   - Title, author(s), weekly effort estimate
   - Automatability verdict and any facilitator note
   - One sentence on why it ranks here (based on effort/energy, not speculation about what automation would look like)

6. **Always end with:** "Do any of these priorities need adjusting before I continue?"

   Wait for the facilitator to confirm or adjust the list. Do not proceed to drafting automation plans, estimating complexity, or writing any implementation without explicit confirmation.

**Important constraints:**
- Do not classify additional activities as automatable — only reference verdicts the team set during discussion
- Do not suggest specific automation tools or approaches unless the facilitator explicitly asks
- Merged activities (with multiple co-authors) represent stronger signal — note this but do not weight them differently in the ranking
