# Spec: User Role Based Action

> Behavioral spec: who the users are, what they do, and the approach taken to solve the problem.

---

## Context

Engineering teams do periodic retrospectives, but standard retro formats (Start/Stop/Continue, 4Ls) don't address the underlying question: *what work are we doing, and should we still be doing it that way?*

This tool is built for a specific retro format: the **work audit**. It replaces one retrospective session per quarter. The team lead runs the session; engineers participate in real time.

## Users and Their Goals

### Team Lead
- Wants to understand the full landscape of what their team does day-to-day
- Needs to identify the highest-ROI automation targets before the next planning cycle
- Runs the session in a meeting — wants minimal facilitation overhead
- Reviews results after the session and uses them to inform the backlog

### Engineer
- Wants their pain points heard and acted on
- Doesn't want overhead — submitting activities should be fast
- Wants to see what colleagues are doing (transparency, not surveillance)

## The Flow

1. Lead creates a session and shares the link in the meeting
2. Engineers join (no login) and spend ~10 minutes listing their recurring activities
3. For each activity, they answer four quick questions:
   - How long does this take? (quick / medium / significant)
   - Do you enjoy it? (yes / meh / no)
   - Is it repetitive? (yes / sometimes / no)
   - Could it be automated or replaced by a tool? (yes / maybe / no)
4. Lead switches to the results view — all activities are visible, grouped by automation potential
5. Team discusses, lead marks priorities
6. Lead exports the prioritized list

## What Makes This Different

- No login required for engineers — friction must be near zero
- The four-question tagging model is fixed — not configurable — to keep sessions focused
- The lead has a separate view with aggregation controls; engineers see a simple card board
- This is a single-session tool — no ongoing project management, no account history
