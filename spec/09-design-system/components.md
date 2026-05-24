# Components

All reusable UI components use the `wa-*` CSS class prefix. Each class below defines the visual properties, states, and variants for a specific component. Components are styled using CSS custom properties from the color token system — see [color-tokens.md](./color-tokens.md).

---

## wa-screen

The full-viewport root container used as the outermost wrapper on every screen.

| Property | Value |
|---|---|
| Width | 100% |
| Min-height | 100dvh (dynamic viewport height) |
| Box sizing | border-box (applied globally to all children) |
| Font family | IBM Plex Sans, system-ui, sans-serif |
| Color | `--ink` |

Every screen in the application uses `.wa-screen` as its root element. It establishes the viewport bounds, default font, and color context for all children.

---

## wa-btn

The base button style for all interactive buttons.

| Property | Value |
|---|---|
| Display | inline-flex |
| Padding | 10px vertical, 16px horizontal |
| Border radius | 4px |
| Font weight | 500 |
| Font size | 13px |
| Background | `--ink` |
| Color | `--cream` |
| Cursor | pointer |

### Variants

| Class modifier | Background | Text color | Border |
|---|---|---|---|
| (base) | `--ink` | `--cream` | 1px solid `--ink` |
| `.is-ghost` | transparent | `--ink` | 1px solid `--rule` |
| `.is-rust` | `--rust` | white | 1px solid `--rust` |

---

## wa-input

The standard text input component used in all forms.

| Property | Value |
|---|---|
| Width | 100% |
| Padding | 10px vertical, 12px horizontal |
| Border | 1px solid `--rule` |
| Border radius | 4px |
| Background | white |
| Font family | IBM Plex Sans, system-ui, sans-serif |
| Font size | 14px |
| Color | `--ink` |

### Focus State

When focused, the input:
- Removes the default browser outline
- Changes the border color to `--ink`
- Adds a subtle warm box shadow

---

## wa-label

The form field label that appears above an input.

| Property | Value |
|---|---|
| Display | block |
| Font family | IBM Plex Mono, monospace |
| Font size | 11px |
| Text transform | uppercase |
| Letter spacing | 0.08em |
| Color | `--muted` |
| Margin bottom | 6px |

---

## wa-chip

A small inline badge used for status indicators, verdicts, and metadata tags.

| Property | Value |
|---|---|
| Display | inline-flex |
| Padding | 3px vertical, 8px horizontal |
| Border radius | 4px |
| Font family | IBM Plex Mono, monospace |
| Font size | 11px |
| White space | nowrap |

### Variants

| Class modifier | Background | Text color | Border |
|---|---|---|---|
| (base) | `--paper` | `--ink-2` | 1px solid `--border-soft` |
| `.is-rust` | `--rust-bg` | `#6a2810` (dark rust) | 1px solid `#e8c8b8` |
| `.is-sage` | `--sage-bg` | `#3b4a2b` (dark sage) | 1px solid `#c8d2b1` |
| `.is-amber` | `--amber-bg` | `#6f4318` (dark amber) | 1px solid `#e8d2a8` |
| `.is-slate` | `--slate-bg` | `#2a3a4a` (dark slate) | 1px solid `#b8c5d0` |
| `.is-ghost` | transparent | `--muted` | none |

---

## wa-card

A generic container card.

| Property | Value |
|---|---|
| Background | `--card` (white) |
| Border | 1px solid `--border` |
| Border radius | 6px |

---

## wa-seg

A segmented control for mutually exclusive options (e.g., filter toggles, view switches).

The `.wa-seg` wrapper:

| Property | Value |
|---|---|
| Display | inline-flex |
| Border | 1px solid `--rule` |
| Border radius | 4px |
| Background | white |
| Overflow | hidden |

Child buttons within `.wa-seg`:

| Property | Value |
|---|---|
| Background | transparent |
| Border | none |
| Border right | 1px solid `--border-soft` |
| Padding | 7px vertical, 12px horizontal |
| Font size | 12px |
| Color | `--ink-2` |
| Font weight | 500 |

The last child button omits the right border.

When a child button carries the `.is-on` class:

| Property | Value |
|---|---|
| Background | `--ink` |
| Color | `--cream` |

---

## wa-tabs

A tab bar for switching between named views or sections.

The `.wa-tabs` wrapper:

| Property | Value |
|---|---|
| Display | inline-flex |
| Background | `--paper` |
| Border radius | 4px |
| Padding | 3px |
| Border | 1px solid `--border-soft` |

Child buttons within `.wa-tabs`:

| Property | Value |
|---|---|
| Background | transparent |
| Border | none |
| Padding | 6px vertical, 12px horizontal |
| Font size | 12px |
| Color | `--muted` |
| Border radius | 3px |
| Font weight | 500 |

When a child button carries the `.is-on` class:

| Property | Value |
|---|---|
| Background | white |
| Color | `--ink` |
| Box shadow | subtle drop shadow |

---

## wa-topbar

The top navigation bar that appears at the top of every screen.

| Property | Value |
|---|---|
| Display | flex |
| Padding | 14px vertical, 24px horizontal |
| Border bottom | 1px solid `--border-soft` |
| Background | `--cream` |
| Gap | 16px between flex children |

The topbar is not a sticky or fixed element — it participates in normal document flow at the top of the viewport. It does not scroll with page content.

---

## wa-brand

The brand identity unit displayed in the topbar.

| Property | Value |
|---|---|
| Display | flex |
| Gap | 8px |
| Font family | Newsreader, Georgia, serif |
| Font size | 18px |
| Font weight | 500 |
| Letter spacing | -0.01em |

### Link Behavior

The `wa-brand` unit must always be rendered as an `<a href="/">` anchor element, not a `<div>` or `<span>`. Clicking the brand navigates the user to the application home page (`/`). This applies on every screen — engineer screens and facilitator screens alike. The anchor should carry `textDecoration: none` to suppress the default underline.

---

## wa-brandmark

The small logo mark that appears to the left of the brand wordmark.

| Property | Value |
|---|---|
| Width | 22px |
| Height | 22px |
| Border | 1.5px solid `--ink` |
| Border radius | 3px |
| Background | `--ink` |
| Color | `--cream` |
| Font family | IBM Plex Mono, monospace |
| Font size | 11px |
| Font weight | 600 |

---

## wa-avatar

A circular avatar that displays a participant's initials.

| Property | Value |
|---|---|
| Width | 24px |
| Height | 24px |
| Border radius | 50% |
| Background | `--paper-deep` |
| Color | `--ink-2` |
| Font family | IBM Plex Mono, monospace |
| Font size | 10px |
| Font weight | 600 |
| Display | inline-flex (centered content) |
| Letter spacing | 0 |

### Variants

| Class modifier | Dimensions | Font size |
|---|---|---|
| (base) | 24×24px | 10px |
| `.is-sm` | 20×20px | 9px |
| `.is-lg` | 32×32px | 12px |

---

## wa-activity

The activity card component used on the engineer board and facilitator live view.

| Property | Value |
|---|---|
| Background | white |
| Border | 1px solid `--border` |
| Border radius | 6px |
| Padding | 12px vertical, 14px horizontal |

### wa-activity-title

The title text within an activity card.

| Property | Value |
|---|---|
| Font size | 14px |
| Color | `--ink` |
| Font weight | 500 |
| Line height | 1.3 |

### wa-flagged

A modifier applied to an activity card when the activity has `flagged: true`. The left accent is achieved via an inset box shadow (not a CSS border-left):

| Property | Value |
|---|---|
| Box shadow | `inset 3px 0 0 var(--flag)` — creates a 3px rust-colored left accent |

---

## wa-dot

A small circular status indicator.

| Property | Value |
|---|---|
| Width | 6px |
| Height | 6px |
| Background | `--sage` |
| Display | inline-block |
| Border radius | 50% |
| Margin right | 6px |

### Variant: `.is-pulsing`

When the dot carries `.is-pulsing`, it animates with a fade pulse:

- Animates opacity from 1 to 0.3 and back to 1
- Duration: 2 seconds
- Iteration: infinite
- Timing: ease-in-out

This variant is used alongside the live feed indicator and the timer urgency state.

---

## wa-dot-activity

A circular dot used as a plotted data point in the automatability matrix visualization. Used by the `MatrixDot` component.

| Property | Value |
|---|---|
| Position | absolute |
| Transform | translate(-50%, -50%) — centers the dot on its percentage coordinates |
| Border radius | 50% |
| Display | flex (centered content) |
| Cursor | pointer |
| Transition | box-shadow 0.1s |

The dot's actual size (width/height) is set per-instance based on whether the activity is flagged (36px) or standard (30px). In the discuss view mini-matrix, the focused activity's dot is rendered larger (34px vs 22px for others).

**Border styles (set per-instance, not via CSS classes):**

| Condition | Border |
|---|---|
| Active / selected | 2.5px solid `--ink`; box shadow adds a wider glow ring |
| Unclassified (not active) | 1.5px dashed `--muted-2` |
| Flagged (not active, classified) | 2px solid `--ink` |
| Standard (not active, classified) | 1.5px solid `rgba(0,0,0,0.15)` |

**Fill colors (set per-instance by `teamAuto` value):**

| `teamAuto` | Fill |
|---|---|
| `yes` | `--rust` |
| `maybe` | `--amber` |
| `no` | `#8a8170` (warm gray — not a named design token) |
| `unclassified` | `#fff` (white) |

**Text color:** White for classified activities; `--ink` for unclassified.

**Flagged indicator:** When `flagged: true`, a "★" star is absolutely positioned at the top-right of the dot, in `--flag` color at 11px.

**Hover state:** Box shadow expands to `0 0 0 4px rgba(28,26,22,0.1), 0 4px 12px rgba(0,0,0,0.14)`.

### MatrixDot Cluster Positioning

When multiple activities would occupy the same matrix coordinate (same tpo + freq + energy combination), they are spread into a small ring around the centroid so individual dots remain visible and clickable.

**Grouping key:** Activities are grouped by their matrix coordinate rounded to 1 decimal place.

**Spread radius formula:** `min(3.5 + count × 0.4, 6)` percent — grows slightly with group size, capped at 6%.

**Angle distribution:**
- For 2 activities: placed vertically (one above the centroid, one below)
- For 3+ activities: evenly distributed clockwise around the centroid, starting at the top (−π/2)

**Boundary clamping:** Each spread position is clamped to [1%, 99%] to prevent dots from leaving the plot area.

---

## wa-quad-label

A label placed at the corners or edges of the automatability matrix quadrants.

| Property | Value |
|---|---|
| Font family | IBM Plex Mono, monospace |
| Font size | 10px |
| Text transform | uppercase |
| Letter spacing | 0.1em |
| Color | `--muted-2` |
| Position | absolute |

---

## wa-tick

A status ticker — small uppercase monospace text used for live status indicators (e.g., "live", "recording").

| Property | Value |
|---|---|
| Font family | IBM Plex Mono, monospace |
| Font size | 10px |
| Letter spacing | 0.06em |
| Color | `--muted` |
| Text transform | uppercase |

---

## wa-rule

A horizontal divider line.

| Property | Value |
|---|---|
| Height | 1px |
| Background | `--rule` |
| Border | none |
| Margin | 0 |

---

## wa-undo-toast

The undo notification displayed at the bottom of the screen after a soft delete.

| Property | Value |
|---|---|
| Position | fixed |
| Location | bottom of viewport, centered or left-aligned |

The toast contains:
- An "Undo" button
- A visual drain animation — a progress bar or fill element that depletes over 5 seconds

When the drain animation completes without the user clicking "Undo," the actual delete event is sent to the server. See [../10-business-rules/soft-delete.md](../10-business-rules/soft-delete.md) for the full soft-delete behavior.

---

## wa-title-input

An inline-editable text field used for editing an activity's title directly on its card, without opening a separate modal.

The field appears in place of the title text when the engineer activates edit mode on their card.

---

## wa-pencil-trigger

A pencil icon element that becomes visible when the user hovers over an editable card area. Its presence signals that the field or card is editable. The icon is hidden by default and revealed via a CSS hover rule on the parent container.

---

## wa-card-action

An action button (such as delete or edit) that is revealed when the user hovers over an activity card. Hidden by default; shown via a CSS hover rule on the parent `.wa-activity` container.

---

## EffortPill (React component)

Renders a colored chip showing the computed effort label for an activity.

| Property | Value |
|---|---|
| Prefix | "◷ " (clock symbol) before the formatted effort string |
| Font weight | 600 |
| Font variant | tabular-nums |
| Sizes | sm (10.5px, 2px/6px padding), md (12px, 3px/8px padding), lg (13px, 5px/10px padding) |
| Color | Determined by `effortTone(hrs)`: < 1.5 h/wk → is-sage, < 4 → is-amber, ≥ 4 → is-rust |
| Title tooltip | "{TPO_LABEL} × {FREQ_LABEL}" |

---

## ActivityChipsShort (React component)

Renders a compact row of chips for an activity's tpo, freq, and energy values, using the short label for each.

| Chip | Short label examples | Color class |
|---|---|---|
| tpo | "<30 min", "30m–2h", "½ day", "1+ day" | TPO_TONE (sage/neutral/amber/rust) |
| freq | "Daily", "Wkly", "Mthly", "Qtrly", "Ad hoc" | FREQ_TONE (rust/amber/neutral/neutral/sage) |
| energy | "Energizes", "Fine", "Tedious", "Drains" | ENERGY_TONE (sage/neutral/amber/rust) |

Optionally shows a fourth chip for `teamAuto` when `showAuto=true` and the value is not `unclassified`. The auto chip is prefixed with "★ " and uses AUTO_TONE.

---

## FacActions (React component)

Three inline facilitator action buttons rendered in a row. Hidden by default in most contexts and shown on hover via parent CSS rules.

| Button | Icon/label | Title tooltip | Action |
|---|---|---|---|
| Edit | "✎ edit" | "Edit activity" | Calls `onEdit` callback |
| Merge | "⇄ merge" | "Merge into…" | Calls `onMerge` callback |
| Remove | "×" | "Remove" | Calls `onRemove` callback |

Button style: transparent background, 1px solid `--border-soft`, border-radius 3px, mono font, muted color. Available in `sm` (10px) and `md` (11px) sizes.

---

## QStrip (React component)

A compact segmented control used for inline editing of tpo, freq, or energy values directly on activity cards (without opening a modal). It renders a row of touching segments separated by soft borders.

### Interactive mode

When an `onChange` handler is provided:
- Each segment is rendered as a `<button>` with class `wa-qseg is-tappable`
- Clicking a segment calls `onChange(value)`
- The selected segment gets class `is-on` (dark background, cream text)
- Unselected segments get a hover state of `--paper-deep` background

### Read-only mode

When no `onChange` handler is provided:
- Each segment is rendered as a `<div>` with class `wa-qseg`
- No hover states apply

### Layout

| Property | Value |
|---|---|
| Row border | 1px solid `--border-soft` around the full row |
| Border radius | 3px |
| Overflow | hidden |
| Segment padding | 6px vertical, 4px horizontal |
| Font size | 10.5px |
| Selected bg | `--ink` |
| Selected color | `--cream` |
| Unselected color | `--muted-2` |

---

## QuestionBlock (React component)

An expanded form question with a sub-label, used in the activity submission form for the three engineer questions (tpo, freq, energy).

Each QuestionBlock renders:

| Element | Description |
|---|---|
| Number prefix | Small monospace number (e.g., "01") in muted-2 color |
| Question text | 14px bold question text |
| Hint text | Italic 12px muted hint next to the question |
| Option row | A flex row of option buttons (one per value) |

Each option button:
- Full-text label at 12.5px bold
- Sub-label below at 10.5px monospace at 70% opacity
- When selected: dark background (`--ink`), cream text
- When not selected: white background, ink text, rule border
- Flex: 1 (equal widths)

---

## ClassifyBtn (React component)

A tri-state button used for the team automatability classification. Used in both the matrix view sidebar and the discuss view right rail.

| Prop | Effect |
|---|---|
| `label` | Main label text at 14px bold |
| `sub` | Subtitle text at 10px mono, 75% opacity |
| `tone` | "rust", "amber", or unset (neutral) — determines color scheme |
| `active` | When true, applies the filled/selected color |

**Color behavior when active:**

| Tone | Active background | Active text |
|---|---|---|
| "rust" | `--rust` | white |
| "amber" | `--amber` | white |
| neutral | `--ink` | `--cream` |

**Color behavior when inactive:**

| Tone | Inactive background | Inactive text | Border |
|---|---|---|---|
| "rust" | `--rust-bg` | `#6a2810` | `#e8c8b8` |
| "amber" | `--amber-bg` | `#6f4318` | `#e8d2a8` |
| neutral | white | `--ink` | `--rule` |
