# Derived Calculations

This file defines all values that are computed from activity fields rather than stored directly. No derived value defined here is persisted on an activity record. All calculations are performed on-the-fly whenever the value is needed for display, sorting, or positioning.

The numeric inputs to all calculations come from the enumeration tables in [enumerations.md](./enumerations.md).

---

## Effort (Hours Per Week)

### Formula

Effort in hours per week is computed by multiplying the time-per-occurrence hours value by the frequency per-week multiplier:

> hours_per_week = tpo_hours × freq_per_week_multiplier

Where:
- `tpo_hours` is the Hours value for the activity's `tpo` enumeration value (from the tpo table in [enumerations.md](./enumerations.md))
- `freq_per_week_multiplier` is the Per-week multiplier for the activity's `freq` enumeration value (from the freq table in [enumerations.md](./enumerations.md))

### Examples

| tpo | freq | tpo_hours | freq_multiplier | hours_per_week |
|---|---|---|---|---|
| `30m-2h` | `weekly` | 1.25 | 1 | 1.25 h/wk |
| `<30m` | `daily` | 0.5 | 5 | 2.5 h/wk |
| `half-day` | `monthly` | 4 | 0.23 | ~0.92 h/wk |
| `day+` | `daily` | 8 | 5 | 40 h/wk |
| `<30m` | `adhoc` | 0.5 | 0.3 | 0.15 h/wk |
| `day+` | `quarterly` | 8 | 0.077 | ~0.62 h/wk |

---

## Effort Display Formatting

The raw `hours_per_week` value is transformed into a human-readable string before display. The formatting rules apply thresholds in order from lowest to highest:

| Condition | Display Format | Example |
|---|---|---|
| hours_per_week is less than 1 | "<1 h/wk" | 0.15 h/wk → "<1 h/wk" |
| hours_per_week is less than 1.5 | "~1 h/wk" | 1.25 h/wk → "~1 h/wk" |
| hours_per_week is less than 3 | "~{value rounded to 1 decimal place} h/wk" | 2.5 h/wk → "~2.5 h/wk" |
| hours_per_week is less than 8 | "~{value rounded to nearest whole number} h/wk" | 5.75 h/wk → "~6 h/wk" |
| hours_per_week is 8 or greater | "8+ h/wk" | 40 h/wk → "8+ h/wk" |

Rules are applied in the order shown — the first condition that matches determines the output. The tilde (~) character indicates approximation and is included in the output string for all "approximately" cases.

The display string is used in the EffortPill component, activity card tooltips, and anywhere effort is presented textually. It is not used in sorting or calculation — those operations use the raw `hours_per_week` number.

---

## Effort Color

The EffortPill component that displays the formatted effort string is colored according to the urgency of the effort load. Three color tiers apply:

| Condition | Color Role | Visual Intent |
|---|---|---|
| hours_per_week is less than 1.5 | sage (green tone) | Low urgency — this work is not a significant time burden |
| hours_per_week is less than 4 | amber (yellow-orange tone) | Moderate urgency — worth monitoring |
| hours_per_week is 4 or greater | rust (red-orange tone) | High urgency — this work consumes a meaningful portion of the week |

Color roles are design-system tokens, not specific hex values. The implementation maps these tokens to specific colors in its design system. Thresholds are applied in order; the first matching condition determines the color.

---

## Perceived Cost

### Purpose

Perceived cost is a composite score that combines the objective effort load (hours per week) with the subjective energy drain of performing the activity. It is used to rank activities by their combined impact — an activity that is both time-consuming and draining ranks higher than one that is equally time-consuming but energizing.

### Formula

> perceived_cost = hours_per_week × energy_multiplier

Where `energy_multiplier` is the Perceived-cost multiplier for the activity's `energy` enumeration value (from the energy table in [enumerations.md](./enumerations.md)).

### Energy Multipliers Summary

| energy value | multiplier |
|---|---|
| `energizing` | 0.5 |
| `fine` | 1.0 |
| `tedious` | 1.5 |
| `draining` | 2.0 |

### Examples

| tpo | freq | energy | hours_per_week | multiplier | perceived_cost |
|---|---|---|---|---|---|
| `half-day` | `weekly` | `draining` | 4 | 2.0 | 8.0 |
| `day+` | `weekly` | `energizing` | 8 | 0.5 | 4.0 |
| `30m-2h` | `daily` | `tedious` | 6.25 | 1.5 | 9.375 |
| `<30m` | `monthly` | `fine` | ~0.115 | 1.0 | ~0.115 |

### Usage

Perceived cost is used in two places:

1. **Default sort order in the discuss view**: Activities in `unclassified` state are sorted by perceived cost descending, so the facilitator encounters the highest-burden work first in the discussion sequence.
2. **Grouped view sort by "effort"**: When the facilitator sorts the grouped view by effort, activities within each `teamAuto` group are sorted by perceived cost descending.

Perceived cost is never displayed as a number to users. It is a computational sorting key only.

---

## Matrix Position

The matrix is a 2×2 scatter plot that positions every activity by its effort (X axis) and energy level (Y axis). It is shown in the facilitator's matrix view during the discussion phase.

### X Axis — Effort (Horizontal Position)

The X axis represents effort in hours per week, scaled from 0% (left edge, zero effort) to 100% (right edge, maximum effort). A square-root scaling is applied to prevent activities from bunching at the low end of the scale.

Formula for X position (as a percentage, 0 to 100):

> x_percent = min(92, sqrt(hours_per_week ÷ 12) × 100)

Where:
- `sqrt` is the square root function
- The divisor `12` represents the reference maximum effort (12 h/wk maps to 100% before the cap)
- The result is capped at `92` to leave visual breathing room at the right edge of the chart

Rationale for square-root scaling: A linear scale would compress most activities into the left 20% of the chart, since few engineers have activities exceeding 4–5 h/wk. The square root scale spreads activities more evenly across the horizontal range. An activity at 1 h/wk is not plotted at 8% (as it would be linearly) but is spread further right, making individual activities easier to distinguish.

#### X Position Examples

| hours_per_week | sqrt(h/12) | ×100 | capped at 92 | final x_percent |
|---|---|---|---|---|
| 0.5 | 0.204 | 20.4% | — | 20.4% |
| 1.0 | 0.289 | 28.9% | — | 28.9% |
| 2.5 | 0.456 | 45.6% | — | 45.6% |
| 4.0 | 0.577 | 57.7% | — | 57.7% |
| 8.0 | 0.816 | 81.6% | — | 81.6% |
| 12.0 | 1.000 | 100% | capped | 92% |
| 40.0 | 1.826 | 182.6% | capped | 92% |

### Y Axis — Energy (Vertical Position)

The Y axis represents energy level. The axis is **inverted**: the top of the chart (low Y percentage) represents the most draining work, and the bottom (high Y percentage) represents the most energizing work. This inversion is intentional — visually, "bad" work rises to the top of the matrix.

Y positions are fixed per energy value, with deliberate offsets away from the 50% midpoint to avoid placing any activity dead-center:

| energy value | y_percent | Visual position |
|---|---|---|
| `draining` | 12% | Near top — most draining |
| `tedious` | 37% | Upper half |
| `fine` | 63% | Lower half |
| `energizing` | 88% | Near bottom — most energizing |

Y positions are not calculated — they are looked up from this fixed table. No interpolation between values occurs.

---

## Matrix Quadrants

The matrix is divided into four quadrants by the 50% threshold on both axes. Each quadrant has a label, a description, and an optional background tint.

| Quadrant | X condition | Y condition | Label | Description | Background |
|---|---|---|---|---|---|
| Priority Zone | x_percent > 50% | y_percent < 50% | ↗ PRIORITY ZONE | FIX OR REMOVE | Rust background tint |
| Tolerable | x_percent < 50% | y_percent < 50% | ↖ TOLERABLE | ACCEPT OR QUICK-WIN | No tint |
| Strategic | x_percent > 50% | y_percent > 50% | ↘ STRATEGIC | CELEBRATE | No tint |
| Healthy Default | x_percent < 50% | y_percent > 50% | ↙ HEALTHY DEFAULT | LEAVE ALONE | Sage background tint |

The Y condition uses the y_percent values as defined above. Because the Y axis is inverted (smaller y_percent = more draining = top of chart), "y_percent < 50%" corresponds to the draining/tedious half of the scale, and "y_percent > 50%" corresponds to the fine/energizing half.

In practical terms:

- Activities with `energy` of `draining` or `tedious` have y_percent values of 12% and 37% respectively — both below 50% — so they fall in the top two quadrants.
- Activities with `energy` of `fine` or `energizing` have y_percent values of 63% and 88% respectively — both above 50% — so they fall in the bottom two quadrants.

The arrows in the quadrant labels (↗, ↖, ↘, ↙) are decorative and indicate the conceptual "direction" of each zone relative to the center.

Activities positioned exactly on the 50% boundary on either axis (which cannot happen with the fixed Y positions, but could theoretically occur on the X axis at exactly 50%) are assigned to the quadrant on the right side (X > 50% treated as "high effort") by convention.
