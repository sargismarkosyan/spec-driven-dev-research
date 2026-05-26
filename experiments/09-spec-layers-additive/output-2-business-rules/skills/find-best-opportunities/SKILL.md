# Skill: find-best-opportunities

Surface the highest-value automation and improvement candidates from a Work Audit session.

## When to use

Use when the facilitator asks "what should we tackle first?", "what are the best automation candidates?", or "where is the team spending the most energy on draining work?".

## Steps

1. Call `get_session` to confirm session exists and check status.
2. Call `list_activities` filtered to `energy=draining`, sorted by effort descending. This gives the most costly draining activities.
3. Also call `list_activities` filtered to `teamAuto=yes` to get confirmed automatable activities.
4. For each activity, compute a priority score:

   ```
   score = effortHrsPerWk × (
     teamAuto === 'yes'           ? 3.0  :
     teamAuto === 'maybe'         ? 1.5  :
     teamAuto === 'no'            ? 0.2  :
     teamAuto === 'unclassified'  ? 1.0  : 0
   )
   ```

   Multiply by 1.5 if `energy === 'draining'`.

5. Rank all activities by score descending. Return the top 5.
6. For each of the top 5, provide:
   - Activity title and contributor(s)
   - Effort: ~Xh/wk
   - Energy: draining / neutral / energizing
   - Team verdict: automatable / maybe / manual / not yet classified
   - One-sentence rationale explaining why it ranks here

7. Also highlight any unclassified activities with `energy=draining` and high effort as "needs team discussion during classification".

8. Present the list and ask the facilitator: "Would you like me to flag any of these as priorities? I'll wait for your confirmation before making any changes."

## Constraints

- **Do not flag or classify any activities autonomously.** Present candidates and ask for confirmation. The team verdict is a human decision.
- If discussion hasn't started (`teamAuto === 'unclassified'` for most activities), note that scores are preliminary — the team hasn't decided on automatability yet.
- Never recommend removing work that is `energy=energizing` just because it's high effort. Surface it but mark it as "strategic — protect, don't remove".
