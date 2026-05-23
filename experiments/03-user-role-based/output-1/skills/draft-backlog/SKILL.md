# Skill: Draft Backlog

Turn the prioritized results of a Toil Tracker session into a ready-to-import backlog of automation tickets.

## Trigger

Use this skill when the facilitator asks to draft tickets, create backlog items, or produce a task list from the session results.

## Inputs

- `session_id` (required) — The Toil Tracker session ID.
- `format` (optional) — Output format: `markdown` (default) or `json`.

## Steps

1. Call `list_activities` with `session_id`. Filter to activities that have a `priority` set (high / medium / low).
2. If no prioritized activities exist, call `get_automation_candidates` with `limit: 10` as a fallback and use those as the candidate pool. Inform the facilitator that no priorities were set and these are based on automation score.
3. For each prioritized activity, draft a ticket with:
   - **Title**: "Automate: {activity title}" (or "Eliminate: {activity title}" if `automatable = yes` and `enjoyment = no`)
   - **Priority**: from the activity's priority field
   - **Description**: 2-3 sentences covering:
     - What the activity is and who does it
     - Why it's a good automation target (duration + repetitiveness)
     - A suggested approach (script, tool, workflow automation, AI assistant — keep it brief and speculative)
   - **Labels**: derive from the activity tags (e.g. `automation`, `toil`, `significant` if duration is significant)
4. Sort tickets: high priority first, then medium, then low. Within a priority group, sort by automation score (significant + repetitive + automatable = yes first).

## Output format (markdown)

```markdown
## Backlog — {session title}
Generated from {n} prioritized activities.

---

### [High] Automate: {title}
**Labels:** automation, toil, significant
{description}

---

### [Medium] Automate: {title}
…
```

## Output format (json)

```json
[
  {
    "title": "Automate: {title}",
    "priority": "high",
    "labels": ["automation", "toil"],
    "description": "…"
  }
]
```

## Guardrails

- Do not invent details not present in the activity data.
- Keep suggested approaches short and clearly marked as suggestions ("could be automated with…", "consider…").
- If the session status is `open`, note that the session is still in progress and results may change.
