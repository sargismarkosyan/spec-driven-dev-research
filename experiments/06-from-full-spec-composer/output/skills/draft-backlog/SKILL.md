---
name: draft-backlog
description: Convert flagged Work Audit activities into draft backlog items for Linear, Jira, GitHub, or plain text.
---

# Draft Backlog

**Purpose:** Convert the session's flagged activities into draft backlog items ready to paste into a project management tool. The AI produces structured items and asks the facilitator which format to use before delivering the final output.

This skill is **read-only** with respect to session data. It produces text output only.

---

## Required Steps

The AI must execute the following steps in order:

### Step 1 — Fetch flagged activities

Call the `list_activities` MCP tool with:

- `sessionId`: the provided session ID
- `filter`: `"flagged"`

This returns only the activities that the facilitator has marked as priorities. If the result is empty (no flagged activities), inform the facilitator and stop — do not proceed to drafting.

### Step 2 — Draft a backlog item for each flagged activity

For each flagged activity, produce a draft backlog item containing the following fields:

#### Title

Rewrite the activity's title as an action-oriented phrase. Use one of the following verb patterns appropriate to the activity's `teamAuto` verdict:

- `teamAuto` is `yes`: "Automate [activity]"
- `teamAuto` is `maybe`: "Investigate automating [activity]"
- `teamAuto` is `no`: "Remove [activity]" or "Streamline [activity]"
- `teamAuto` is `unclassified`: "Investigate [activity]"

#### Effort note

State the recurring cost as: "approximately X h/wk currently (this is the recurring cost, not the automation implementation cost)."

Compute `effortHrsPerWk` from the activity's `tpo` and `freq` using:

> `effortHrsPerWk = TPO_HOURS[tpo] × FREQ_PER_WK[freq]`

Where **TPO_HOURS:** `<30m → 0.5`, `30m-2h → 1.25`, `half-day → 4`, `day+ → 8`; **FREQ_PER_WK:** `daily → 5`, `weekly → 1`, `monthly → 0.23`, `quarterly → 0.077`, `adhoc → 0.3`.

#### Contributors

List the names of all participants who reported this activity. For merged activities, include all names from `reportedBy`.

#### Acceptance criteria stub

Write one Given/When/Then acceptance criterion in the following structure:

- **Given:** the current situation (describe the manual or recurring work)
- **When:** the solution is implemented
- **Then:** the expected outcome (typically: time saved, process eliminated, or work automated)

The stub should be a starting point, not a final definition. It may be incomplete or imprecise — it is intended to prompt the engineering team's refinement.

#### Size estimate

Assign a T-shirt size based on recurring cost (`effortHrsPerWk`):

| Size | Recurring cost threshold |
|---|---|
| S (Small) | Less than 1 h/wk |
| M (Medium) | 1 h/wk to less than 3 h/wk |
| L (Large) | 3 h/wk or more |

Note: This size reflects the size of the recurring problem, not the estimated engineering effort to solve it.

### Step 3 — Ask for the target format

Before delivering the formatted backlog items, ask the facilitator which format they prefer:

- **Linear** — Markdown with Linear-compatible structure
- **Jira** — Markdown with Jira-compatible structure
- **GitHub Issues** — Markdown formatted for GitHub Issues
- **Plain Markdown** — Generic Markdown, no tool-specific formatting

The AI must ask for the format in Step 3 and must not assume a default format without asking.

### Step 4 — Deliver formatted output

Reformat all drafted backlog items using the chosen format and present them as a block ready to copy and paste directly into the target tool. Each item should be self-contained and not require modification before pasting, though the facilitator may edit any field.

---

## Format Templates

### Linear

```markdown
## [Title]

**Size:** [S/M/L] · **Recurring cost:** ~X h/wk

**Contributors:** [names]

[Effort note paragraph]

**Acceptance criteria**
- Given [situation]
- When [solution implemented]
- Then [expected outcome]
```

### Jira

```markdown
h2. [Title]

*Size:* [S/M/L]
*Recurring cost:* ~X h/wk
*Contributors:* [names]

[Effort note paragraph]

h3. Acceptance criteria
*Given* [situation]
*When* [solution implemented]
*Then* [expected outcome]
```

### GitHub Issues

```markdown
### [Title]

- **Size:** [S/M/L]
- **Recurring cost:** ~X h/wk
- **Contributors:** [names]

[Effort note paragraph]

**Acceptance criteria**
- [ ] Given [situation], when [solution implemented], then [expected outcome]
```

### Plain Markdown

Use the Linear template structure without tool-specific syntax.

---

## Constraints

- The skill does not submit backlog items to any external tool. It produces text output only.
- The skill must not modify any activity data in the Work Audit session.
- The skill must not add, remove, or change flags — it works with the flagged set as it exists at invocation time.
- Size estimates are based solely on `effortHrsPerWk` and must not be adjusted based on subjective assessment.

---

## Acceptance Criteria

- [ ] Stops with a clear message when no flagged activities exist.
- [ ] Each flagged activity produces title, effort note, contributors, acceptance stub, and size.
- [ ] Facilitator is asked to choose output format before final delivery.
- [ ] Final output matches the chosen format and is copy-paste ready.
- [ ] No session or activity data is modified.
