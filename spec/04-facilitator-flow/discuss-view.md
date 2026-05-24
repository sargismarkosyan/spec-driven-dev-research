# Discuss View

**View tab:** "Discuss"

The discuss view is the facilitator's classification workspace. The facilitator works through each unclassified activity one at a time, assigns a team verdict on automatability, optionally flags priority items, and adds discussion notes. The view auto-activates when the session transitions to the `discussion` status.

The facilitator topbar remains visible in this view. See [live-view.md](./live-view.md) for the full topbar specification.

---

## Auto-Activation

- When the server broadcasts a `session:status` event with the value `discussion`, the facilitator main view automatically switches to the Discuss tab without any manual action.

---

## Layout

The discuss view uses a two-region layout:

| Region | Width | Content |
|---|---|---|
| Main area | Flexible | Progress bar, mini matrix, pending activity tray |
| Right rail | Fixed | Currently-reviewing activity panel with classify, flag, navigation, and similar activities |

---

## Main Area

### Header

- Text: "Discussion · tagging automatability + flagging priorities"

### Progress Bar

The progress bar is rendered inline in the main area header row, to the right of the heading:

| Element | Description |
|---|---|
| Tick label | "↳ {classified} / {activities.length} classified" in monospace |
| Visual bar | A 120px wide proportional progress bar (dark fill, paper-deep background) showing `classified / total` ratio |
| "Classified" definition | Activities where `teamAuto` is NOT `unclassified` (i.e., any of yes/maybe/no) |
| Total definition | All active activities (non-source activities). The denominator excludes `isMergedSource: true` activities. |
| Real-time updates | The bar and count update as each activity is classified |

### Mini Matrix

A reduced version of the matrix plot (same quadrant structure as the matrix view but smaller):

| Element | Description |
|---|---|
| Classified activities | Shown as filled colored dots (rust, amber, gray per verdict) |
| Unclassified / pending activities | Shown as outline/dashed dots |
| Currently-focused activity | Its dot is rendered slightly larger to indicate the active review state |

The mini matrix uses the same quadrant labels as the full matrix: '↗ PRIORITY ZONE', '↖ TOLERABLE', '↘ STRATEGIC', '↙ HEALTHY DEFAULT'. Labels are not abbreviated for the mini version.

### Pending Tray

The pending tray is shown below the mini matrix when one or more activities remain unclassified.

**Tray header:**

| Element | Description |
|---|---|
| Eyebrow | In rust color: "↳ Needs classification ({count})" |
| Subtext | When skipped count > 0: "{N} skipped · deferred to end"; when no skips: "not yet placed" |

**Pending activity pills (flex-wrapped row):**

Each unclassified activity is rendered as a pill in this row:

| Element | Description |
|---|---|
| Avatar | Small colored circle with submitter's initials |
| Title | Activity title, truncated if necessary |

**Pill states:**

| State | Visual style |
|---|---|
| Active (currently being reviewed) | Dark background with cream text |
| Skipped | Dimmed, grayed style |
| Default / pending | Standard pill style |

- Clicking a pill navigates to that activity in the right rail (makes it the "now reviewing" activity).

---

## Right Rail — Now Reviewing

The right rail shows the activity currently under review by the facilitator.

### Header

| Element | Description |
|---|---|
| Eyebrow | In rust color: "↳ Now reviewing · {index + 1} / {pending count + classified count}" — the denominator is the total of all active activities (pending + classified), not just the pending ones |

### Activity Detail

| Element | Description |
|---|---|
| Activity title | Bold, large text |
| Avatar | Colored circle with submitter's initials |
| Submitter name | Display name |
| Effort pill | Standard effort pill |
| Tpo chip | Small chip showing time per occurrence |
| Freq chip | Small chip showing frequency/cadence |

### Facilitator Action Buttons (on the reviewed activity)

| Button | Action |
|---|---|
| Edit | Opens the edit modal (see [edit-modal.md](./edit-modal.md)) |
| Merge | Opens the merge modal (see [merge-modal.md](./merge-modal.md)) |
| Remove | Deletes the activity |

---

### Classification Section

| Element | Description |
|---|---|
| Eyebrow | "↳ Team verdict · automatable?" |

Three ClassifyBtn buttons displayed in a row (each takes 1fr of available width):

| Button label | Tone | Subtitle | Socket event emitted | Verdict value |
|---|---|---|---|---|
| "Yes" | Rust | "clearly" | `activity:classify` | `yes` |
| "Maybe" | Amber | "partial" | `activity:classify` | `maybe` |
| "No" | Neutral | "human judgement" | `activity:classify` | `no` |

- Keyboard shortcut note in monospace below the buttons: "↳ shortcut · 1 / 2 / 3"

---

### Flag Section

| Element | Description |
|---|---|
| Eyebrow | "↳ Flag this for next quarter?" |

**Flag button behavior:**

| Condition | Button label | Style | Action |
|---|---|---|---|
| Activity is not flagged | "★ Flag for next quarter" | Rust (`wa-btn is-rust`), full width | Emits `activity:flag` with `flagged = true` |
| Activity is already flagged | "✕ Unflag" | Ghost (`wa-btn is-ghost`), full width | Emits `activity:flag` with `flagged = false` |

When the current activity is already flagged (`activity.flagged === true`), the flag button switches to the ghost style (`wa-btn is-ghost`) and its label becomes '✕ Unflag'. When the activity is not flagged, the button uses the rust style (`wa-btn is-rust`) with label '★ Flag for next quarter'.

- Keyboard shortcut: `f` key toggles the flag state.

**Discussion note textarea:**

| Property | Value |
|---|---|
| Label | "Optional discussion note · who'll own it…" |
| Type | Textarea with vertical resize handle |
| Required | No |

---

### Similar Activities Section

Shown when any other activities (from different submitters) have word overlap similarity above the threshold with the currently-reviewed activity. The section is displayed with an amber-tinted background.

| Rule | Value |
|---|---|
| Similarity threshold | Word overlap score > 0.2 |
| Maximum results shown | 3 |
| Exclusion | Activities from the same submitter as the reviewed activity are excluded from similarity comparison |
| Section header | "↳ {N} TEAMMATE(S) REPORTED SOMETHING SIMILAR" in amber monospace |

Each similar activity item is displayed as a row:

| Element | Description |
|---|---|
| Avatar | Small (16×16px) colored circle with submitter's initials |
| Activity title | Truncated title text of the similar activity |
| "⇄ merge" button | A small monospace button that opens the merge modal for the currently-reviewed activity (not the similar one) |

The similar activities list shows only one action per item: the '⇄ merge' button. No 'link', 'relate', or other relationship action is shown alongside or instead of the merge button.

The word overlap similarity calculation:
- Tokenizes both titles by lowercasing, removing non-word characters, splitting on whitespace, and filtering to words with more than 3 characters.
- Score = `intersection size / union size` (Jaccard similarity on the word sets).
- Activities are excluded from the list if score ≤ 0.2. Results are sorted by score descending, capped at 3.

**All-classified empty state:** When all activities have been classified and the pending list is empty, the right rail shows a centered completion state:

- "✓" check mark at 28px
- "All activities classified!" at 14px bold
- "Export the results when you're done discussing." at 12px muted

**No-activity empty state:** When no focus activity exists and no activities are classified either, the right rail shows: "Select an activity from the tray to begin."

---

### Flagged So Far Section

A scrollable section showing all activities that have been flagged during this discussion session.

| Element | Description |
|---|---|
| Eyebrow | "★ Flagged so far" followed by the flagged count in monospace |

**Empty state when no activities are flagged:** "No activities flagged yet." in italic muted text. The empty state is always rendered — the flagged section is not hidden when the list is empty.

Each flagged activity card:

| Element | Description |
|---|---|
| Left border | Rust-colored left accent border |
| Card background | Rust-tinted background |
| Count | Monospace sequential count |
| Avatar | Colored circle with submitter's initials |
| Submitter first name | First word of the submitter's display name |
| Activity title | Bold text |

---

### Navigation Buttons

Three navigation buttons are pinned to the bottom of the right rail:

| Button | Label | Style | Flex | Keyboard shortcut | Action |
|---|---|---|---|---|---|
| Prev | "← Prev" | Ghost | 1 | `j` or `←` | Navigate to the previous activity in the ordered list |
| Skip | "Skip ↷" | Ghost (muted color) | 1 | `s` | Move the current activity to the end of the pending queue; stay at the same index (which now points to the next item) |
| Next | "Next →" | Primary (dark) | 2 | `k` or `→` | Navigate to the next activity in the ordered list |

**Above the nav buttons**, a keyboard shortcut hint row is shown in small monospace:

> "← j   k →   1/2/3 classify   f flag   s skip"

The navigation button row and keyboard shortcut hint remain visible even after the pending queue is empty — they do not disappear when all activities have been classified. Once all activities are classified the right rail shows the 'All activities classified!' completion state while still keeping the nav buttons visible.

**Skip behavior in detail:**

- The skipped activity's ID is added to a local `skippedIds` list in the client.
- The ordered pending list is reconstructed after each skip: non-skipped activities first (sorted by perceived cost descending), then skipped activities at the end.
- The index is clamped to `min(current index, length - 2)` to prevent going out of bounds.
- The `skippedIds` list is client-local only — the server is not notified of skips. Skip state is lost on page refresh.

---

## Keyboard Shortcuts

All keyboard shortcuts are disabled when the focused element is an `INPUT` or `TEXTAREA`, to prevent accidental actions while typing.

| Key(s) | Action |
|---|---|
| `j` or `←` (ArrowLeft) | Navigate to the previous activity (index − 1, min 0) |
| `k` or `→` (ArrowRight) | Navigate to the next activity (index + 1, max last index) |
| `1` | Classify current activity as `yes` (Automatable) |
| `2` | Classify current activity as `maybe` |
| `3` | Classify current activity as `no` (Manual) |
| `f` | Toggle flag on the current activity (emits `activity:flag`) |
| `s` | Skip current activity — defer to end of queue |

---

## Cross-References

- Edit modal: [edit-modal.md](./edit-modal.md)
- Merge modal: [merge-modal.md](./merge-modal.md)
- Facilitator topbar specification: [live-view.md](./live-view.md)
- Engineer read-only view of verdicts applied here: `../03-engineer-flow/board-discussion.md`
- Verdict color rules: `../02-data-model/enumerations.md`
