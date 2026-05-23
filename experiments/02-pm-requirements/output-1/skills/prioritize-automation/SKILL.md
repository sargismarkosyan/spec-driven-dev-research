---
name: prioritize-automation
description: Identify and rank the highest-value automation opportunities from a Toil Tracker session.
---

## Instructions

1. Ask the user for the session ID if not already provided.
2. Call `get_automation_candidates` with the session ID. The tool returns activities scored by automation potential, repetitiveness, and low enjoyment.
3. Present the top candidates (up to 5) in a ranked table with columns: Rank, Title, Submitter, Time Estimate, Score, and a one-sentence rationale for each.
4. The rationale should explain *why* this item scores high (e.g. "Repetitive, not enjoyed, and engineer believes it can be automated").
5. If there are no candidates with a score above 3, say so and suggest the team revisit tagging — particularly the automation potential field.
6. End with one sentence naming the single best place to start and why.
