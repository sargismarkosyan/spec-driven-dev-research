# Matrix View

**View tab:** "Matrix"

The matrix view renders all activities as dots on a two-dimensional scatter plot. The X axis represents effort (time cost) and the Y axis represents energy (how the work feels). The facilitator uses this view to understand the distribution of activities and identify priority zones at a glance.

The facilitator topbar (including timer, view tabs, export button, and action button) remains visible in this view. See [live-view.md](./live-view.md) for the full topbar specification.

---

## Layout

The matrix view uses a two-region layout:

| Region | Width | Content |
|---|---|---|
| Main matrix area | Flexible | Matrix header, filter chips, and the plot |
| Right sidebar | 320px | Selected activity detail panel |

---

## Matrix Header

| Element | Description |
|---|---|
| Eyebrow | "Priority view · energy × effort · color = team verdict" |
| Heading | "Where does the team bleed time on draining work?" (22px display font) |

### Filter Chips

Two filter chips are displayed in a row (visual, non-functional in the current implementation — rendered as static chip labels with a ▾ chevron):

| Chip label |
|---|
| "All roles ▾" |
| "All cadences ▾" |

---

## Matrix Plot Area

The plot area has a white background with a visible border.

### Background Quadrant Tints

| Quadrant | Position | Background tint |
|---|---|---|
| Top-right | High effort, high drain | Rust color at 0.45 opacity (priority zone) |
| Bottom-left | Low effort, low drain | Sage/green color at 0.35 opacity (healthy zone) |
| Top-left | Low effort, high drain | No tint |
| Bottom-right | High effort, low drain | No tint |

### Crosshair Lines

- Two dashed lines cross at exactly 50% on both axes — one horizontal and one vertical — dividing the plot into four quadrants.

### Quadrant Labels

Each quadrant has a label in monospace uppercase, absolutely positioned within the plot area:

| Quadrant | Label | Color |
|---|---|---|
| Top-right | "↗ PRIORITY ZONE" | Rust |
| Top-left | "↖ TOLERABLE" | Muted |
| Bottom-right | "↘ STRATEGIC" | Muted |
| Bottom-left | "↙ HEALTHY DEFAULT" | Sage |

### Axis Labels

| Axis | Position | Text |
|---|---|---|
| X axis | Bottom center, outside the plot | "← LOW EFFORT · EFFORT (~ h/wk) · HIGH EFFORT →" |
| Y axis | Left center, outside the plot, rotated 90° counterclockwise | "← ENERGIZING · ENERGY · DRAINING →" |

### Legend

Displayed in the top-left corner, outside the plot area:

| Symbol | Meaning |
|---|---|
| Rust filled circle | Automatable |
| Amber filled circle | Maybe |
| Gray filled circle (#8a8170) | Manual |
| White circle with dashed border | Unclassified |
| "★" | Flagged |

---

## Activity Dots

Each non-merged-source activity is plotted as a dot on the matrix.

### Dot Positioning

- The dot's X and Y coordinates are computed from the activity's matrix coordinates (see `../02-data-model/calculations.md`).

### Dot Sizing

| Condition | Dot diameter |
|---|---|
| Standard activity | 30px |
| Flagged activity | 36px |

### Dot Fill Color

| `teamAuto` value | Fill color |
|---|---|
| `yes` | Rust |
| `maybe` | Amber |
| `no` | Gray (#8a8170) |
| `unclassified` | White |

### Dot Border

| Condition | Border style |
|---|---|
| Active / selected dot | 2.5px solid ink |
| Unclassified dot (not selected) | 1.5px dashed muted |
| Flagged dot (not selected) | 2px solid ink |
| Normal dot (not selected) | 1.5px semi-transparent |

### Flagged Dot Indicator

- When an activity is flagged: a small "★" star icon appears in the top-right corner of the dot.

### Hover State

- Hovering a dot adds a box shadow to indicate interactivity.

### Clustering (Overlap Prevention)

- When multiple activity dots would occupy positions within a small radius of each other, they are spread in a small ring around their computed center point.
- This ensures that overlapping dots remain individually visible and individually clickable.

### Dot Selection

- Clicking a dot selects it.
- The selected dot receives the active border style (2.5px solid ink).
- The right sidebar updates to display the selected activity's detail panel.
- Only one dot can be selected at a time.

---

## Right Sidebar — Selected Activity Detail

### Auto-Selection

- When the view renders and activities exist, the first activity in the list is selected by default — the right panel is never empty as long as there are activities.
- When no activities exist (empty matrix): display "Click a dot to inspect an activity."

### Selected Activity Detail Panel

When an activity is selected (either by default or by clicking a dot), the right sidebar displays:

#### Selection Index

- Text in monospace: "Selected · {n} of {total}" — where `{n}` is the selected dot's rank and `{total}` is the total number of plotted activities.

#### Activity Header

| Element | Description |
|---|---|
| Activity title | Bold (19px display font) |
| Avatar | Colored circle with submitter's initials |
| Submitter name | Display name at 13px bold |
| Role | "IC" in small monospace muted text (hardcoded in the current implementation) |
| Effort pill | Large effort pill (`size="lg"`) |

#### Detail Rows

Each detail row has a label and a chip:

| Label | Chip |
|---|---|
| "Time / occ" | Tpo chip |
| "Cadence" | Freq chip |
| "Energy" | Energy chip |
| "Verdict" | TeamAuto chip (color-coded by verdict) |

#### Divider

A horizontal rule separates the detail rows from the zone section.

#### Zone Section

An eyebrow labeled "Position" precedes the zone chip. The zone chip shows which quadrant the activity falls in:

| Condition | Label | Chip class |
|---|---|---|
| y < 50% AND x > 50% | "↗ PRIORITY ZONE" | `is-rust` |
| y < 50% AND x ≤ 50% | "↖ TOLERABLE" | `is-sage` |
| y ≥ 50% AND x > 50% | "↘ STRATEGIC" | Default (no accent class) |
| y ≥ 50% AND x ≤ 50% | "↙ HEALTHY DEFAULT" | `is-sage` |

Note: Y-axis values below 50% correspond to the draining/upper half of the matrix.

#### Divider

A second horizontal rule separates the zone section from the classify section.

#### Classify Section

| Element | Description |
|---|---|
| Eyebrow | "↳ Team verdict · automatable?" |
| Buttons | Three ClassifyBtn buttons in a row: "Yes" (subtitle "clearly", rust tone), "Maybe" (subtitle "partial", amber tone), "No" (subtitle "human", neutral tone) |
| Actions | Each button emits `activity:classify` with the corresponding verdict value |

The three classify buttons are always arranged in a horizontal row — never stacked vertically.

#### Flag Button

| Condition | Button label | Style | Action |
|---|---|---|---|
| Activity is not flagged | "★ Flag for next quarter" | Rust | Emits `activity:flag` with `flagged: true` |
| Activity is already flagged | "✕ Unflag" | Ghost | Emits `activity:flag` with `flagged: false` |

#### Facilitator Action Buttons

| Button | Action |
|---|---|
| Edit | Opens the edit modal (see [edit-modal.md](./edit-modal.md)) |
| Merge | Opens the merge modal (see [merge-modal.md](./merge-modal.md)) |
| Remove | Deletes the activity |

#### Discussion Note (Conditional)

- When a discussion note has been set for the activity: display the note below the action buttons, with "↳ TEAM DISCUSSION NOTE" as an eyebrow label.
- When no discussion note exists: this section is not shown.

---

## Cross-References

- Dot coordinate calculations: `../02-data-model/calculations.md`
- Edit modal: [edit-modal.md](./edit-modal.md)
- Merge modal: [merge-modal.md](./merge-modal.md)
- Facilitator topbar specification: [live-view.md](./live-view.md)
- Verdict and effort color rules: `../02-data-model/enumerations.md`
