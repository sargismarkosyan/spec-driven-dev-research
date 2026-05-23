# Skill: Find Best Automation Candidates

Surface the highest-value automation opportunities from a Toil Tracker session for facilitator review.

## Trigger

Use this skill when the facilitator asks which activities are best to automate, what should be prioritized, or what the top candidates are.

## Steps

1. Call the MCP tool `find_automation_candidates` with the current `sessionId` and `limit: 10`.
2. Present the candidates as a ranked list, showing for each:
   - Activity title and contributor name
   - Weekly effort (~h/wk)
   - Energy drain level
   - Current classification (if any)
3. Ask the facilitator: "Would you like me to classify any of these as Automatable?"
4. Only if the facilitator explicitly confirms a verdict for a specific activity, call `classify_activity` with `confirmedByFacilitator: true`.

## Constraints

- Never classify autonomously. Always ask first.
- Never flag autonomously. If flagging seems useful, suggest it and wait for confirmation.
- Only present unclassified activities unless the facilitator asks to see all.
