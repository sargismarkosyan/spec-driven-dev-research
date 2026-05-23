# Skill: Prioritize Automation Candidates

Identify the highest-value activities for automation or elimination: those that are both draining and expensive in weekly time.

## Trigger

Use this skill when the facilitator asks which activities to tackle first, what to automate, or what the top candidates are.

Example prompts:
- "What should we automate first?"
- "Which activities are the biggest wins?"
- "Show me the top automation candidates"
- "What's in the top-right quadrant?"

## Steps

1. Call `get_top_automation_candidates` with the session ID and limit (default 5).
2. For each candidate, assess:
   - Weekly time cost (higher = more impactful)
   - Whether a verdict has been set by the team
   - Whether it's already flagged
3. Rank by weekly minutes (descending). Break ties by putting already-flagged items first.
4. Recommend the top 3–5 as immediate targets.

## Output format

Return a ranked list with:
- Activity description
- Weekly cost in minutes
- Team verdict (if set)
- A one-sentence rationale for why it's a good automation candidate

Keep it under 200 words total.
