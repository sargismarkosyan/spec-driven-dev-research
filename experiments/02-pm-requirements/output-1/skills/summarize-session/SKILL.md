---
name: summarize-session
description: Summarize the results of a Toil Tracker session — counts by attribute and key patterns.
---

## Instructions

1. Ask the user for the session ID if not already provided.
2. Call `summarize_session` with the session ID to get counts broken down by automation potential, time estimate, enjoyment, and repetitiveness.
3. Call `get_session` to retrieve the full activity list for qualitative context.
4. Write a short summary (one paragraph) covering:
   - Total activities and how many participants contributed.
   - What fraction is marked high automation potential.
   - What fraction the team doesn't enjoy.
   - Whether any attribute combination stands out (e.g. repetitive + not enjoyed + automation=yes).
5. Follow with a bullet list of the key numbers from `summarize_session`.
6. Keep the response concise — one paragraph plus bullets, no headers.
