---
name: draft-backlog
description: Draft a prioritized backlog from flagged Toil Tracker activities, ready to paste into a project tracker.
---

## Instructions

1. Ask the user for the session ID if not already provided.
2. Call `list_activities` with `flagged: true` to retrieve the flagged activities.
3. If no activities are flagged, stop and ask the facilitator to flag the items worth tracking in the Toil Tracker UI before running this skill.
4. For each flagged activity, draft a backlog item in this format:
   - **Title**: "Automate: [activity title]"
   - **Description**: One sentence — what the activity is and why it is worth automating.
   - **Size**: Derived from `timeEstimate` — quick → S, medium → M, significant → L.
   - **Value**: High if `enjoyment=no` AND `repetitiveness=yes`; Medium otherwise.
5. Sort the output: High Value first, then within the same tier sort S before M before L.
6. Present as a numbered list so the facilitator can paste it directly into a backlog tool.
7. End with one sentence naming the top item to tackle first and the reason (highest value + smallest size wins).
