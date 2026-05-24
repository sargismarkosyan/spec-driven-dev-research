# Live View

**Route:** `/session/[id]/facilitator`

**View tab:** "Live" (default selected tab)

The live view is the default view of the facilitator main hub and is shown when the session status is `active`. It gives the facilitator a real-time overview of submission activity: a per-person count panel, a live stream of the most recent cards, and an emerging themes/frequency panel.

---

## Top-Level Loading State

While the session data is loading on initial page visit:

- A loading spinner or loading message is displayed.
- The main view content is not rendered until the session is available.

---

## Facilitator Topbar (Shared Across All Views)

The topbar is visible in all facilitator views and is defined here as the canonical reference.

### Left Section

The topbar eyebrow subtitle is a dynamic string assembled from the following components in sequence:

| Component | Condition | Format |
|---|---|---|
| Base | Always shown | "FACILITATOR · {N} activities" |
| Classified count | Only when classified count > 0 | " · {classified}/{total} classified" |
| Flagged count | Only when flagged count > 0 | " · {flagged} flagged" |

Example: "FACILITATOR · 14 activities · 9/14 classified · 3 flagged"

Both N (total activities) and the classified denominator exclude `isMergedSource: true` activities — only non-source activities count toward these totals.

### Timer Section (Active Phase Only)

The timer is shown only when session status is `active` AND `submissionWindowMin` > 0.

| Condition | Timer display |
|---|---|
| Time remaining > 120 seconds | Countdown in `m:ss` format using tabular-numeral digits, default ink color; container has default background; pulsing dot is sage (green) |
| Time remaining ≤ 120 seconds | Countdown in rust/red color; container background changes to `--rust-bg`; pulsing dot turns rust/red |
| Time remaining ≤ 0 | "Time up" text replaces the countdown |
| `submissionWindowMin` = 0 | Timer is not rendered |

A pulsing dot (`wa-dot is-pulsing`) is always shown beside the countdown while the timer is visible — it is not exclusive to the urgent state. It is sage-colored during normal countdown and switches to rust when urgent. The "LEFT" label (small monospace, muted) also appears beside the countdown while time remains; it disappears when the display shows "Time up".

**Extend buttons** (shown next to the timer when the timer is visible):

| Button | Label | Action |
|---|---|---|
| Extend 2 | "+2 min" | Adds 2 minutes; emits `session:extend` with `addMinutes: 2` |
| Extend 5 | "+5 min" | Adds 5 minutes; emits `session:extend` with `addMinutes: 5` |

**Client-side snap-forward logic for expired timers:**

When an extend button is clicked and the timer has already expired (the elapsed time has exceeded the current window), the client applies a snap-forward correction before emitting the socket event:

- If `elapsed minutes ≥ current window`: new window = `ceil(elapsed minutes) + added minutes`, so the remaining time becomes positive immediately.
- If `elapsed minutes < current window`: new window = `current window + added minutes` (normal extend).

The client updates its local `windowMinRef` before the socket event is emitted, so the timer display refreshes immediately rather than waiting for the server response.

The `session:extended` socket event from the server updates `windowMinRef` when received. The REST extend endpoint (`POST /api/sessions/{id}/extend`) adds minutes directly without snap-forward logic.

### Status-Based Action Button

| Session status | Button label | Style | Action |
|---|---|---|---|
| `lobby` | "Start submissions →" | Rust/primary | Starts the session |
| `active` | "End → start discussion" | Standard | Emits `session:close`; transitions session to `discussion` |
| `discussion` or later | No button | — | Not rendered |

No additional "Mark session complete" or similar button is shown in the discussion state. The status-based action button is not rendered once the session has moved to discussion.

### View Tabs

An inline segment control for switching between facilitator views:

| Tab label | View |
|---|---|
| Live | Live view (this file) |
| Matrix | Matrix view |
| Grouped | Grouped view |
| Discuss | Discuss view |

- Switching tabs is client-side only; it does not cause page navigation.
- When the server broadcasts a `session:status` update to `discussion`, the active tab switches automatically to "Discuss."

### Export Button

| Property | Value |
|---|---|
| Label | "Export ↗" |
| Style | Ghost button |
| Badge | Shows the flagged activity count when any activities have been flagged |
| Action | Opens the export modal (see [export-modal.md](./export-modal.md)) |

The Export button is only shown when the session status is `discussion` or `done`. It is not rendered during `lobby` or `active` states.

---

## Live View Layout

The live view body uses a three-column layout:

| Panel | Width | Content |
|---|---|---|
| Left panel | 260px | Per-person submission counts |
| Center panel | Flexible | Live stream of recent activities |
| Right panel | Auto | Emerging themes + frequency distribution |

---

## Left Panel — Per-Person Submission Counts

### Section Header

- Eyebrow label in monospace: "↳ Submissions per person"

### Participant Cards

One card per non-facilitator participant. Each card contains:

| Element | Description |
|---|---|
| Avatar | Colored circle with participant initials |
| Name | Participant display name |
| Role | Role label in monospace |
| Activity count | Right-aligned count in monospace |

**Activity count color rules:**

| Count | Status label | Color |
|---|---|---|
| 3 or more | "ok" | Sage/green |
| 1 or 2 | "low" | Amber |
| 0 | "idle" | Muted-2 (gray, no accent color) |

Under the count number, the card shows the count in monospace as either "not started" (for 0 activities) or "{N} activities" (for 1+).

### Totals Section

Shown below the participant card list, separated by a divider:

| Label | Value |
|---|---|
| "Activities so far" | Total activity count in monospace |
| "Per-engineer avg" | Average activities per engineer in monospace |

---

## Center Panel — Live Stream

### Section Header

- Heading: "Live stream" (22px display font)
- Tick label: "↳ newest first" (monospace, muted, uppercase)

### Empty State

- When no activities have been submitted: "Waiting for engineers to submit activities…"

### Activity Cards in the Stream

| Rule | Value |
|---|---|
| Maximum cards shown | 10 most recent activities across all engineers |
| Sort order | Newest first (most recent at top) |
| Exclusion | Merged source activities (activities that have been consumed as the source in a merge operation) are excluded |

Each activity card in the stream displays:

| Element | Description |
|---|---|
| Avatar | Colored circle with submitter's initials |
| Submitter name | Display name of the submitting engineer |
| Activity title | The activity title text |
| Effort pill | Computed effort label with design-system color |
| ActivityChipsShort | Three chips: tpo chip, freq chip, energy chip — displayed in a compact row |

**Merged activity cards:**

- When an activity is the result of a merge operation: an expandable section is shown within the card.
- Expanding it reveals the original source cards that were merged into this activity, displayed in a dimmed style.

**Facilitator action buttons (visible on hover):**

| Button | Label | Action |
|---|---|---|
| Edit | "✎ edit" | Opens the edit modal for this activity (see [edit-modal.md](./edit-modal.md)) |
| Merge | "⇄ merge" | Opens the merge modal for this activity (see [merge-modal.md](./merge-modal.md)) |
| Delete | "×" | Deletes this activity (with confirmation or undo mechanism) |

---

## Right Panel — Emerging Themes and Frequency Distribution

### Emerging Themes Section

**Section header:**

- Eyebrow label in monospace: "↳ Emerging themes"
- Intro text: "Patterns by topic — automatability gets decided together in discussion."

**Empty state:**

- When fewer than 2 engineers have submitted activities with shared words: "Themes will emerge as submissions grow."

**Theme generation rules:**

- Only words with more than 3 characters (length > 3) are considered.
- A theme is a word that appears in activity titles submitted by 2 or more different engineers (unique contributor count ≥ 2).
- Maximum 5 themes are shown.
- Sort order: by unique contributor count, descending.
- For each theme, the list of first names of contributing engineers is shown in monospace.

**Each theme display:**

| Element | Description |
|---|---|
| Word | The theme keyword |
| Count badge | Number of engineers whose submissions contain this word; colored rust for the top 2 themes, standard for the rest |
| Submitter names | List of the engineers whose activities contain this word, in monospace |

### Frequency Distribution Section

**Section header:**

- Eyebrow label in monospace: "↳ Frequency distribution"

**Bar chart layout:**

A horizontal bar chart with one row per cadence value. Each row:

| Element | Description |
|---|---|
| Label | Cadence name, left-aligned in 70px fixed column |
| Bar | A proportional colored bar whose length represents the relative count of activities with this cadence; bar fills a flex container against a `--paper-deep` background |
| Count | Number of activities with this cadence, right-aligned in monospace |

**Cadence rows (in order) with their bar colors:**

| Row label | Bar color |
|---|---|
| Daily | Rust (`--rust`) |
| Weekly | Amber (`--amber`) |
| Monthly | Slate (`--slate`) |
| Quarterly | Slate (`--slate`) |

Bar lengths are proportional to each other: `(count / max_count) × 100%`. The denominator is `max(all counts, 1)` to prevent division by zero. `adhoc` activities are not shown as a separate row in this distribution.

---

## Cross-References

- Edit modal triggered from this view: [edit-modal.md](./edit-modal.md)
- Merge modal triggered from this view: [merge-modal.md](./merge-modal.md)
- Export modal triggered from topbar: [export-modal.md](./export-modal.md)
- Switching to matrix view: [matrix-view.md](./matrix-view.md)
- Switching to grouped view: [grouped-view.md](./grouped-view.md)
- Switching to discuss view: [discuss-view.md](./discuss-view.md)
