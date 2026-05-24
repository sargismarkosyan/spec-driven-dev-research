# Board — Discussion State

**Route:** `/session/[id]/board`

**Trigger conditions:** Session status is `discussion` OR session status is `done`.

When submissions are closed by the facilitator, the engineer board transitions to a read-only layout. Engineers can see the team's classifications on their own activities, session-wide flagged priorities in the sidebar, and classification progress. They cannot see other engineers' non-flagged activities.

---

## Layout

The discussion state uses a two-region layout:

| Region | Width | Content |
|---|---|---|
| Main area | Flexible | The engineer's submitted activities in read-only cards |
| Right sidebar | Fixed | Flagged priorities (session-wide) + progress indicator |

The left rail (prompt rail) is NOT shown in the discussion state. The team feed is NOT shown in the discussion state.

---

## Topbar

The topbar remains visible. In the discussion state:

| Element | Description |
|---|---|
| Session name | Left — session name as page title |
| Subtitle | Center — "DISCUSSION IN PROGRESS" in uppercase monospace |
| Timer | Not shown (session is no longer active) |
| Classification count | Session-wide `{classified}/{total} classified` in monospace (not the engineer's personal activity count) |
| Engineer avatar | Shows the engineer's avatar and name |

---

## Main Area

### Heading

- Eyebrow: "Your submitted activities"
- Main heading: "Discussion is live — verdicts appearing in real time."

### Empty State

- When the engineer submitted zero activities: display "You didn't submit any activities."
- The activity list below is not rendered in this case.

### Activity Cards (Read-Only)

Each of the engineer's submitted activities is displayed as a read-only card in submission order. The list includes activities authored by this engineer even when `isMergedSource: true` (merged-away sources are not filtered out on the engineer board).

#### Card Elements

| Element | Description |
|---|---|
| Sequential number | Zero-padded two-digit counter in monospace (01, 02, 03…) |
| Activity title | Displayed as static text — NOT editable; no pencil icon |
| Effort pill | Computed effort pill with color per design system rules |
| Team verdict chip | Color-coded chip indicating the facilitator's classification (see verdict chip table below) |
| Flag indicator | A "★" star icon on the right side of the card, shown only when the activity has been flagged |
| QStrip rows | Three rows (tpo, freq, energy) showing current values — displayed in read-only mode; tapping does nothing |
| Discussion note | Shown below the QStrip rows when a facilitator discussion note has been set for the activity |

#### Team Verdict Chip Values

| `teamAuto` value | Chip label | Chip tone |
|---|---|---|
| `yes` | "Automatable" | Rust |
| `maybe` | "Maybe" | Amber |
| `no` | "Manual" | Slate |
| `unclassified` | "Pending…" (at 50% opacity) | Ghost (no color / muted) |

#### Real-Time Updates

- Activity cards update in real time as the facilitator classifies activities and sets discussion notes.
- The team verdict chip and discussion note fields reflect the latest data without a page reload.

### Explanatory Callout

Below the activity list, a muted callout box explains: "The facilitator is walking through each activity with the team and deciding on automatability. You'll see verdicts and flags appear above as they happen."

---

## Right Sidebar

### Flagged Priorities Section

#### Section Header

- Eyebrow: "★ Flagged priorities" (rust color when count > 0)
- Count badge in monospace on the right

#### Empty State

- When no activities have been flagged: display "None flagged yet — the list grows as the facilitator marks priorities."

#### Flagged Activity Cards

When one or more activities have been flagged, each is shown as a card. Flagged items are **session-wide** — they include activities from any submitter, not only the viewing engineer.

| Card element | Description |
|---|---|
| Left border | A colored left-side accent border in rust/flag color |
| Sequential number | Monospace counter |
| Submitter avatar | Colored circle with the submitter's initials |
| Submitter first name | First name of the engineer who submitted the activity |
| Activity title | Displayed in bold |
| Star icon | "★" right-aligned within the card |

- Flagged activity cards appear in real time as the facilitator flags activities during discussion.

---

### Progress Indicator

Below a horizontal rule, a progress section shows classification progress for the **entire session**:

| Element | Description |
|---|---|
| Header | "Progress" eyebrow with `{classified}/{total}` in monospace |
| Progress bar | 6px proportional bar (dark fill on paper-deep background) |
| Remaining text | "{N} activities still to review." where N = unclassified count |

- "Classified" count: activities where `teamAuto` is NOT `unclassified`.
- "Total" count: all activities in the session (including merged sources).
- The bar and counts update in real time as the facilitator classifies activities.

---

## Cross-References

- Active state (preceding phase): [board-active.md](./board-active.md)
- Facilitator discuss view (drives the verdicts seen here): `../04-facilitator-flow/discuss-view.md`
- Effort pill and verdict chip color rules: `../02-data-model/enumerations.md`
- Implementation index (canonical visibility rules): `../IMPLEMENTATION-INDEX.md`
