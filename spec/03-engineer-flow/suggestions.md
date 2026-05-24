# Suggestions

The suggestions section sits in the right sidebar of the active board state, above the team feed. It surfaces activities that multiple teammates have submitted, giving the current engineer a one-tap way to add a similar activity for themselves.

**Visibility:** The suggestions section is only shown when there is at least one suggestion to display. When there are no suggestions, the section is omitted entirely — no heading or empty state is rendered.

---

## Section Header

| Element | Style | Content |
|---|---|---|
| Eyebrow label (left) | Rust color | "↳ Have you got these too?" |
| Count (right) | Small monospace, muted | The number of suggestions (e.g., "3") — displayed right-aligned next to the eyebrow, not appended into the label text |
| Intro text | Small body, muted | "Pulled from your team's submissions. Tap to draft a card —" |
| Sub-intro | Small italic, muted | "you'll answer the 3 questions for your situation. Daily for Sarah might be weekly for you." |

---

## Suggestion Generation Rules

Suggestions are derived from the live team feed (other engineers' submitted activities). The following rules apply:

### Source Data

- Source: The team feed — up to 8 most-recent activities submitted by engineers other than the current user (same 8-item window used by the team feed display).

### Deduplication (Grouping)

- Deduplication key: The first 30 characters of each activity title, lowercased and trimmed.
- When multiple teammates submit activities that share the same 30-character prefix (lowercased): they are grouped into a single suggestion.
- The grouped suggestion's count reflects how many teammates submitted a matching title.

### Filtering (Exclusion of Already-Submitted Activities)

- Activities that the current engineer has already submitted are excluded from the suggestions list.
- Comparison is performed on the first 20 characters of the title (lowercased and trimmed).
- When the current engineer's activity title matches a team activity's 20-character prefix: that team activity does not generate a suggestion for this engineer.

### Limit

- A maximum of 4 suggestions are shown at any time.

### Sort Order

- Suggestions are sorted by count descending — the activity reported by the most teammates appears first.

---

## Each Suggestion Item

Suggestions are rendered as tappable buttons with a distinctive dashed rust-colored border.

| Element | Description |
|---|---|
| "+" symbol | A "+" prefix displayed in rust color |
| Activity title | The activity title text |
| Attribution line | Displayed below the title in small monospace: "↳ {firstName}" when reported by one teammate; "↳ {firstName} · {count} on the team" when reported by two or more teammates. `{firstName}` is the first word of the submitter's display name. |
| Border | Dashed rust-colored border |
| Hover state | Border and background change on hover to signal interactivity |

### Clicking a Suggestion

When the engineer clicks a suggestion item:

1. The add-activity form opens (if it is not already open).
2. The title field of the add-activity form is pre-filled with the suggestion's activity title.
3. The engineer must answer the three questions (tpo, freq, energy) themselves — suggestions do not pre-fill question answers.

---

## Real-Time Updates

- The suggestions list recalculates in real time as the team feed receives new submissions.
- When the current engineer submits a new activity, any suggestion that matches it (by the 20-character prefix rule) is removed from the suggestions list immediately.

---

## Cross-References

- The suggestions section is embedded in the right sidebar of the active board: [board-active.md](./board-active.md)
- Source data comes from the team feed: [team-feed.md](./team-feed.md)
- Clicking a suggestion pre-fills the add-activity form: [add-activity-form.md](./add-activity-form.md)
- The suggestions section is only available when `liveTeamFeed` is `true` (since it requires team submissions as input): `../04-facilitator-flow/create-session.md`
