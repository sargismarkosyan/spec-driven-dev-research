---
name: summarize-session
description: Produce a concise narrative summary of a work audit session, covering participation, key themes, and what was decided.
---

## Instructions

Use this skill when a facilitator or stakeholder asks for a summary of a completed or in-progress session.

**Steps:**

1. Call `get_session` with the session ID to get participant count, activity count, flagged count, and phase.

2. Call `list_activities` to retrieve all activities. Note distribution across energy levels and identify the most commonly cited titles.

3. Call `get_priority_matrix` to understand the quadrant breakdown.

4. Write a summary with these sections:

   **Session overview**
   - Session name, date, facilitator, number of participants and their roles
   - Total activities logged, how many were flagged, how many were discussed

   **Key themes**
   - Group activities by theme (meetings, on-call, manual work, etc.) based on titles and categories
   - Name the 2–3 themes with the most entries

   **Energy signal**
   - How many activities were draining vs. energizing vs. neutral
   - Call out any activities that appeared multiple times (merged entries with co-authors)

   **Priority quadrant**
   - List the PRIORITY quadrant (draining + high effort) activities by name
   - Note which were classified as automatable (yes/maybe) vs. not

   **What was decided**
   - List flagged activities with their automatability verdict and any facilitator notes
   - Summarize the team's overall signal: what is the dominant type of toil?

5. Keep the summary factual and concise — this is a record of what the team found, not an interpretation or recommendation. Do not classify or flag anything autonomously.
