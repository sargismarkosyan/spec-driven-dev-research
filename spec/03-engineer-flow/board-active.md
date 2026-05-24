# Board — Active State

**Route:** `/session/[id]/board`

**Trigger condition:** Session status is `active`.

The active state is the primary submission phase. Engineers list the recurring work they do by submitting activity cards and answering three questions per activity. The layout is three columns with a topbar above.

---

## Topbar

The topbar is visible in all board states. In the active state it contains:

| Element | Position | Description |
|---|---|---|
| Session name | Left | The session name displayed as the page title |
| Subtitle | Center | "ENGINEER VIEW · IN PROGRESS" in uppercase monospace |
| Countdown timer | Right | Shown only when session status is `active` AND submission window > 0 minutes |
| Activity count | Right | Number of activities the current engineer has submitted; only shown after the user has joined and a color has been assigned. Format: `"{N} activities"` — the count followed by the word "activities" rendered in a `wa-tick` monospace span. A bare number without the word "activities" is not acceptable. |
| Engineer avatar | Right | A colored circle containing the engineer's initials, followed by their display name; only shown after the user has joined and a color has been assigned |

### Countdown Timer Rules

| Condition | Timer display |
|---|---|
| Time remaining > 120 seconds | `m:ss` format using tabular-numeral digits, default color |
| Time remaining ≤ 120 seconds | `m:ss` format, color changes to red (rust) |
| Time remaining ≤ 120 seconds | A red pulsing dot appears next to the timer |
| Time remaining ≤ 0 seconds | Timer area shows "Time up" text instead of a countdown |
| Submission window = 0 (Untimed) | Timer area is not rendered |

---

## Three-Panel Layout

The active state body uses a fixed three-column layout below the topbar:

| Panel | Width | Content |
|---|---|---|
| Left rail | 220px | Prompt rail — recall prompts (see [prompt-rail.md](./prompt-rail.md)) |
| Center | Flexible | Activity list + add controls |
| Right sidebar | 296px | Suggestions (when available) + team feed (when enabled) |

---

## Center Panel

### Empty State (zero activities submitted, add-form not open)

- Eyebrow: "Submitting as {name} · 0 activities" (monospace)
- Heading: "List the recurring work you do."
- Descriptive text: "One activity per card. Be specific but quick — 'Triage Sentry alerts' not 'deal with errors.' Three questions per card. You can edit anything before discussion starts."
- The add button renders in its large "first activity" style (see "Add Activity Button" below).

### Activity List (one or more activities exist, OR add-form is open)

When at least one activity has been submitted, or when the add-activity form is open, the center panel shows:
- Eyebrow: "Submitting as {name} · {N} activities" (persistent, always visible)
- Heading: "Your recurring work" (replaces the zero-state heading)
- Activity list followed by the add controls

#### Activity Card Structure

Each submitted activity is rendered as a card. Cards are listed in submission order.

| Element | Description |
|---|---|
| Sequential number | Zero-padded two-digit counter in monospace (01, 02, 03…) |
| Activity title | Displayed in an inline-editable field (see "Inline Title Editing" below) |
| Effort pill | Computed effort display; color follows the design system effort-color rules (see `../02-data-model/enumerations.md`) |
| Delete button | A "×" button positioned in the top-right corner of the card |
| QStrip rows | Three rows, one per dimension: time per occurrence (tpo), frequency (freq), energy |

#### QStrip Row Structure

Each of the three QStrip rows contains:

| Element | Description |
|---|---|
| Question label | The dimension name in monospace uppercase |
| Current answer | The currently selected value for that dimension |
| Answer buttons | Tappable option buttons; tapping immediately updates the value via socket (no separate save step) |

#### Quick-Edit Hint

When at least one activity card exists in the list, a hint line is shown above the cards in italic muted monospace:

> "Tap any answer to change it. Hover a title to rename."

This hint appears only when cards are present and is not rendered in the zero-activities state or while the add form is open.

#### Inline Title Editing

- When the engineer hovers over an activity card, a pencil icon appears next to the title.
- Clicking the title text OR the pencil icon makes the title field editable in-place.
- While editing:
  - Pressing Enter saves the new title.
  - Clicking outside the title field saves the new title.
  - Pressing Escape cancels the edit and restores the previous title.

#### Soft-Delete Behavior (5-Second Undo)

When the engineer clicks the "×" delete button on an activity card:

1. The activity card disappears from the list immediately.
2. A toast notification appears at the bottom of the screen containing:
   - A description identifying the deleted activity.
   - An "Undo" button.
   - A visual drain animation (a progress bar or fill area that depletes over 5 seconds).
3. When the engineer clicks "Undo" within 5 seconds: the activity is restored to the list in its original position.
4. When 5 seconds elapse without an undo action: the activity is permanently deleted via the socket/API.

### Add Activity Button

| Condition | Button style | Label | Subtitle |
|---|---|---|---|
| Zero activities submitted | Dashed-border card with circle "+" icon, larger padding | "Add your first activity" | "Start with what you did yesterday or this morning"; keyboard hint "↵" right-aligned |
| One or more activities submitted | Same dashed-border card with smaller padding | "Add another activity" | "Keep listing — aim for 5+" |

- Clicking either form of the add button opens the add-activity form (see [add-activity-form.md](./add-activity-form.md)).

#### "Save & add another" Reset Behavior

After "Save & add another" is clicked and the activity is saved, a new blank form opens with the title field auto-focused and all three question selections cleared (no option pre-selected for tpo, freq, or energy). The named defaults (`30m-2h`, `weekly`, `fine`) are the defaults for an engineer's very first form open, but "Save & add another" always clears to null — no selection.

### Done Notice Banner

A sage-green (sage-bg) informational banner is shown when ALL of the following are true:

- The engineer has submitted at least one activity.
- The add-activity form is NOT currently open.

Banner elements:
- A green checkmark "✓" icon in sage color
- Text: "You're done. Tweak anything until the facilitator starts the discussion."

Note: The facilitator's name is NOT substituted into this text. The message is static.

---

## Right Sidebar

The right sidebar is 296px wide and contains two sections stacked vertically:

| Section | Visibility |
|---|---|
| Suggestions | Only shown when there are suggestions to display; omitted entirely otherwise |
| Team feed | Shown when the session's `liveTeamFeed` setting is `true`; omitted entirely when `false` |

- Suggestions appear above the team feed.
- See [suggestions.md](./suggestions.md) for full suggestions specification.
- See [team-feed.md](./team-feed.md) for full team feed specification.

---

## State Transitions

- When the facilitator closes submissions and the session status changes to `discussion`, the board switches automatically to the discussion state without a page reload (see [board-discussion.md](./board-discussion.md)).

---

## Cross-References

- Left rail: [prompt-rail.md](./prompt-rail.md)
- Add activity form: [add-activity-form.md](./add-activity-form.md)
- Team feed: [team-feed.md](./team-feed.md)
- Suggestions: [suggestions.md](./suggestions.md)
- Discussion state (next phase): [board-discussion.md](./board-discussion.md)
- Effort pill color rules: `../02-data-model/enumerations.md`
