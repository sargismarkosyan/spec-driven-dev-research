# Grouped View

**View tab:** "Grouped"

The grouped view organizes all activities into three columns by their team verdict on automatability. The facilitator uses this view to compare the volume and character of work across verdict groups and to take bulk action on unclassified items.

The facilitator topbar remains visible in this view. See [live-view.md](./live-view.md) for the full topbar specification.

---

## Layout

The grouped view uses a single full-width column layout with no sidebar. The entire content width is used for the three-column verdict grid.

---

## View Header

| Element | Position | Description |
|---|---|---|
| Eyebrow | Top | "Grouped by team verdict on automatability" |
| Heading | Below eyebrow | "Automation backlog · act on these in order." |
| Sort control | Right of heading | "Sort ·" label followed by a tab switcher (see "Sort Control" below) |

### Sort Control

A tab switcher with three options:

| Option | Default | Sort behavior |
|---|---|---|
| Effort | Yes (default selected) | Sort activities by computed effort, descending (highest effort first) |
| Energy | No | Sort activities by energy level, descending (most draining first) |
| Person | No | Sort activities by submitter name, ascending (alphabetical) |

---

## Three-Column Verdict Grid

The three verdict columns are displayed side by side at equal widths.

| Column # | Verdict key | Column title | Column background | Opacity |
|---|---|---|---|---|
| 1 | `yes` | "Automatable" | Rust-bg (`--rust-bg`) | 100% |
| 2 | `maybe` | "Maybe" | Amber-bg (`--amber-bg`) | 100% |
| 3 | `no` | "Manual · no action needed" | Paper (`--paper`) | 72% (column is visually dimmed) |

### Column Container Properties

| Property | Value |
|---|---|
| Border | Soft border |
| Padding | 16px internal padding |
| Overflow | Scrollable within the column height |

### Column Header

Each column header displays:

| Element | Description |
|---|---|
| Activity count | Large (20px) monospace number; colored in rust for "yes", amber for "maybe", muted-2 for "no" |
| Column title | "Automatable", "Maybe", or "Manual · no action needed" — the third column title overrides the verdict label |
| Subtitle hint text | A short descriptor line: "Team agreed: yes · → Build the automation" / "Team agreed: maybe · → Research spike needed" / "Team agreed: no · acknowledged, no action this quarter" |

### Activity Cards Within Each Column

Cards are sorted according to the selected sort option (descending). Each card displays:

| Element | Description |
|---|---|
| Avatar | Colored circle with submitter's initials |
| Submitter first name | First word of the submitter's display name only |
| Effort pill | Small effort pill |
| Flag indicator | "★" star icon, right-aligned, shown only when the activity is flagged |
| Activity title | Bold text |
| Small chips | Tpo chip, freq chip, and energy chip displayed in a compact row |
| Facilitator action buttons | Edit, merge, and delete buttons — small, right-aligned, triggered by hover or tap |
| Ranking number | When the sort produces a meaningful rank order, a rank number is displayed on the card |

#### Facilitator Action Buttons on Cards

| Button | Action |
|---|---|
| Edit | Opens the edit modal for this activity (see [edit-modal.md](./edit-modal.md)) |
| Merge | Opens the merge modal for this activity (see [merge-modal.md](./merge-modal.md)) |
| Delete | Removes the activity |

---

## Unclassified Section

The unclassified section is shown below the three verdict columns when any activities have `teamAuto = 'unclassified'`.

### Section Header

The unclassified section header is a full-width button that toggles expansion:

| Element | Description |
|---|---|
| Activity count | Monospace count of unclassified activities (13px bold, muted color) |
| Heading | "Not yet classified" (16px display font, muted) |
| Hint text | "Classify these during discussion" in small monospace |
| Toggle indicator | "▲ hide" or "▼ show" at the right edge of the header button |

The section is expanded by default when it appears.

### Collapse Behavior

- Clicking the section header toggles the section between expanded and collapsed.
- When expanded: a wrapped grid of unclassified activity cards is shown (approximately 3 cards per row, each ~33% width with 220px minimum).
- When collapsed: only the header row is visible.

### Unclassified Activity Cards

Each unclassified activity card (within the unclassified section) shows:

| Element | Description |
|---|---|
| Avatar | Small colored circle with initials |
| Submitter first name | First word of the submitter's display name |
| Effort pill | Small effort pill |
| Activity title | Bold title text |
| Energy chip | Small energy chip |
| Facilitator action buttons | Edit, merge, delete — right-aligned |

Note: Unclassified cards do NOT show a rank number. Rank numbers appear only in the three verdict columns ("yes", "maybe") for classified activities. The "no" (manual) column also suppresses rank numbers.

---

## Real-Time Updates

- When the facilitator classifies an activity (in the discuss view or matrix view), the activity card moves from the "Unclassified" section to the appropriate verdict column without a page reload.
- The column activity counts update automatically.

---

## Cross-References

- Edit modal: [edit-modal.md](./edit-modal.md)
- Merge modal: [merge-modal.md](./merge-modal.md)
- Facilitator topbar specification: [live-view.md](./live-view.md)
- Verdict and effort color rules: `../02-data-model/enumerations.md`
