# Color Tokens

All color values are defined as CSS custom properties on the `:root` selector. Every component and layout in the application references these tokens — no raw hex values appear in component styles.

---

## Background Palette

These tokens cover all surface colors from the lightest cream to the deepest tan.

| Token | Hex value | Semantic usage |
|---|---|---|
| `--paper` | `#f5f1e8` | Main application background; the warm off-white used as the default page background |
| `--paper-deep` | `#ebe4d2` | Deeper tan; used for secondary panels, form sections, and inset areas that need visual separation from the main surface |
| `--cream` | `#fbf8f1` | Lightest warm white; used for topbars and light surface areas that should float above the paper background |
| `--card` | `#ffffff` | Pure white; used for card surfaces that need maximum contrast against the warm background |

---

## Text Palette

These tokens cover all text colors from primary ink to the most muted metadata labels.

| Token | Hex value | Semantic usage |
|---|---|---|
| `--ink` | `#1c1a16` | Primary text color; near-black with a warm undertone; used for headings, body text, and all primary content |
| `--ink-2` | `#3a342c` | Secondary text; warm dark brown; used for secondary labels and supporting text |
| `--muted` | `#6b6356` | Muted text; used for form labels, placeholders, metadata, and less prominent labels |
| `--muted-2` | `#8a8170` | More muted; used for quadrant labels, less important monospace text, and deeply supporting metadata |

---

## Border Palette

These tokens cover all border and divider colors.

| Token | Hex value | Semantic usage |
|---|---|---|
| `--border` | `#e4dccb` | Standard border color; used for card outlines, input borders, and most component borders |
| `--border-soft` | `#efe8d8` | Softer and lighter border; used for subtler separations that should not visually dominate |
| `--rule` | `#d8d0bf` | Hairline divider color; used for horizontal rules and fine structural lines within layouts |

---

## Accent Colors

Each accent color has a base tone used for text and borders, and a `*-bg` variant used for backgrounds such as chips and cards. Accent colors are used sparingly — each carries a fixed semantic meaning.

### Rust — Primary action and error

| Token | Hex value | Semantic usage |
|---|---|---|
| `--rust` | `#b14d2f` | Primary action color; used for primary buttons, active highlights, and error states |
| `--rust-bg` | `#f5e3da` | Background tint for rust-toned chips and card sections |

### Sage — Healthy and positive

| Token | Hex value | Semantic usage |
|---|---|---|
| `--sage` | `#6b7d5a` | Healthy and low-urgency states; used for low-effort effort pills, the "Healthy Default" quadrant tint, live status dots (green pulsing dot), and the sage-background category chips |
| `--sage-bg` | `#e6ead9` | Background tint for sage-toned chips and the healthy quadrant tint |

### Amber — Warning and investigate

| Token | Hex value | Semantic usage |
|---|---|---|
| `--amber` | `#c8945f` | Warning and moderate states; used for the `maybe` (investigate) verdict indicator |
| `--amber-bg` | `#f5e7d3` | Background tint for amber-toned chips |

### Slate — Neutral and manual

| Token | Hex value | Semantic usage |
|---|---|---|
| `--slate` | `#4a5a6a` | Neutral and manual states; used for the `no` (manual) verdict indicator and low-priority indicators |
| `--slate-bg` | `#dde3e8` | Background tint for slate-toned chips |

### Flag — Priority indicator

| Token | Hex value | Semantic usage |
|---|---|---|
| `--flag` | `#c4502b` | Priority flag color; used specifically for the 3px left-border indicator on flagged activity cards. Distinct from `--rust` — slightly more saturated for use as a colored border element |

---

## Accent Color Semantic Map

| Context | Token used |
|---|---|
| `teamAuto: yes` verdict chip | `--rust` / `--rust-bg` (automatable = urgency to act) |
| `teamAuto: maybe` verdict chip | `--amber` / `--amber-bg` |
| `teamAuto: no` verdict chip | `is-slate` — slate-bg background, dark slate text |
| `teamAuto: unclassified` chip | Ghost style (transparent bg) |
| Matrix dot fill: `yes` | `--rust` |
| Matrix dot fill: `maybe` | `--amber` |
| Matrix dot fill: `no` | `#8a8170` (raw hex, not a token) |
| Matrix dot fill: `unclassified` | White |
| Flagged activity card accent | `--flag` (inset box-shadow left border) |
| Primary buttons | `--rust` / `--ink` |
| Live status dot (participants present) | `--sage` |
| Live status dot (no participants) | `--muted-2` |
| Timer urgency (< 2 min remaining) | `--rust` |
| Effort pill: < 1.5 h/wk | `--sage` |
| Effort pill: 1.5–4 h/wk | `--amber` |
| Effort pill: ≥ 4 h/wk | `--rust` |
| Merge candidate similarity > 60% | `is-rust` chip |
| Merge candidate similarity > 30% | `is-amber` chip |
| Merge candidate similarity ≤ 30% | No accent chip |
