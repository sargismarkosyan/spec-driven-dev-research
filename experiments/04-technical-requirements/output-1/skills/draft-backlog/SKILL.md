# draft-backlog

Converts the prioritized list of automation opportunities from a Toil Tracker session into draft backlog items ready to paste into a project management tool (Linear, Jira, GitHub Issues, etc.).

## When to use

After running `find-best-opportunities`, use this skill to generate actionable backlog items for each opportunity. Each item is self-contained and usable without further context.

## Inputs

- `sessionId` — the session ID
- `opportunities` — the ranked shortlist produced by `find-best-opportunities` (pass the list directly, or re-derive it by running that skill first)
- `tool` *(optional)* — target PM tool: `linear` | `jira` | `github` | `generic` (default: `generic`)

## Steps

1. If `opportunities` was not passed directly, run `find-best-opportunities` for the given `sessionId` to obtain the ranked list.

2. For each opportunity in the list, produce a backlog item with the following fields:

   ### Title
   `[Automate] <concise verb phrase describing what to automate>`
   Keep under 60 characters. Start with an action verb (e.g., "Script", "Automate", "Build pipeline for").

   ### Description
   One paragraph (2–3 sentences) explaining:
   - What the activity is (drawn from the title and tags)
   - Why it matters (time saved, repetitiveness, team enjoyment impact)
   - What the expected outcome of automation looks like

   ### Acceptance Criteria
   3–5 bullet points, each a testable condition, written as "Given / When / Then" or a plain check:
   - The manual steps are eliminated or reduced to a trigger action
   - The automation runs successfully in CI / on a schedule / on demand (choose the most appropriate)
   - Output is verified and alerting exists for failures
   - Runbook or README documents the new process
   - (Optional) Time spent on the activity is measurable before vs. after

   ### Labels / Tags
   Suggest appropriate labels based on the activity type:
   - `automation`, `toil-reduction`, `engineering-productivity`
   - Add `high-priority` if the opportunity score was ≥ 5

   ### Effort estimate
   Based on `timeEstimate` from the activity:
   - `significant` → Large (L): 1–2 sprints
   - `medium` → Medium (M): 3–5 days
   - `quick` → Small (S): 1–2 days

3. Format the output as a numbered list matching the opportunity ranking. Separate each item with a horizontal rule.

4. After all items, add a **Next steps** section with 2–3 sentences on how to import or triage these items (e.g., "Copy each item into your backlog tool, assign owners, and schedule a 30-minute kickoff for the top three.").

## Output format note

If `tool` is `linear`, use Linear's markdown conventions (use `##` for field names, code blocks for labels).
If `tool` is `jira`, wrap each item in a `{panel}` block and use Jira wiki markup.
If `tool` is `github`, format each item as a GitHub issue body with `### Acceptance Criteria` checkboxes (`- [ ]`).
Default (`generic`): use plain markdown.

## Example invocation

```
/draft-backlog sessionId=abc123
```

Or with a specific tool target:

```
/draft-backlog sessionId=abc123 tool=github
```
