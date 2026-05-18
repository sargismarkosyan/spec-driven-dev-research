# Skill: log-toil

Help an engineer log their toil activities into an open Toil Tracker session.

## Trigger

Use this skill when an engineer wants to capture repetitive or manual work they do regularly
and add it to a Toil Tracker session.

## Steps

1. **Confirm the session ID.** Ask the engineer for the session ID if not provided.
   - Verify the session exists and is open using `get_session`.
   - If closed, inform the engineer and stop.

2. **Elicit activities through conversation.** Ask the engineer to describe their toil:
   - "What repetitive or manual work do you do regularly that feels like a waste of time?"
   - For each activity gather:
     - **Description** — a clear, specific description of the task
     - **Category** — type of work (e.g. deployments, on-call, code review, incidents, reporting)
     - **Frequency** — daily / weekly / monthly / occasional
     - **Minutes per occurrence** — realistic estimate of how long it takes each time
     - **Pain level** — 1 (minor inconvenience) to 5 (significant pain or blocker)
   - Prompt for more: "Is there anything else you regularly do that feels manual or repetitive?"
   - Continue until the engineer says they are done.

3. **Add each activity** using `add_activity`.
   - Confirm each one was added successfully.

4. **Summarize** what was logged:
   - List the activities added (description, category, frequency, pain level).
   - Note total estimated weekly minutes contributed by this engineer's activities.
   - Thank the engineer for contributing to the audit.

## MCP Tools Used

- `get_session` — verify session exists and is open
- `add_activity` — submit each toil activity

## Notes

- Do not invent or assume activity details. Ask explicitly if unclear.
- Keep descriptions specific and action-oriented (what the engineer *does*, not a vague category).
- If the engineer is unsure of a pain level, suggest: 1–2 = tolerable, 3 = frustrating, 4–5 = significant time sink or blocker.
