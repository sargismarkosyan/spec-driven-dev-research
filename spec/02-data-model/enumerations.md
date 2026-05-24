# Enumerations

This file defines all enumeration types used in the Work Audit data model. Each enumeration is expressed as a fixed, closed set of string values. No values outside those listed here are valid.

Enumeration values appear in their wire-format form (the exact string stored in the data model) throughout this document. UI display uses the label columns defined in the tables below.

---

## Time Per Occurrence (tpo)

The `tpo` field on an Activity describes how long the activity takes each time it occurs. It has exactly four valid values.

| Wire Value | Long Label | Short Label | Subtitle | Hours |
|---|---|---|---|---|
| `<30m` | Under 30 min | <30 min | minutes | 0.5 |
| `30m-2h` | 30 min – 2 hrs | 30m–2h | a couple hours | 1.25 |
| `half-day` | Half day | ½ day | a chunk | 4 |
| `day+` | A full day or more | 1+ day | all in | 8 |

Field usage:

- **Long Label** is used in selection controls, expanded card views, and exports.
- **Short Label** is used in compact activity card displays and the matrix tooltip.
- **Subtitle** is used beneath the long label in the submission form to give engineers an intuitive reference for what each tier means.
- **Hours** is the numeric value used in all effort calculations. See [calculations.md](./calculations.md).

---

## Frequency (freq)

The `freq` field on an Activity describes how often the activity recurs. It has exactly five valid values.

| Wire Value | Long Label | Short Label | Subtitle | Per-week multiplier |
|---|---|---|---|---|
| `daily` | Daily | Daily | every day | 5 |
| `weekly` | Weekly | Wkly | each week | 1 |
| `monthly` | Monthly | Mthly | each month | 0.23 |
| `quarterly` | Quarterly | Qtrly | each quarter | 0.077 |
| `adhoc` | Ad hoc | Ad hoc | unpredictable | 0.3 |

Field usage:

- **Long Label** is used in selection controls, expanded card views, and exports.
- **Short Label** is used in compact activity card displays.
- **Subtitle** is used beneath the long label in the submission form.
- **Per-week multiplier** is used in effort calculations to convert occurrences into a weekly rate. See [calculations.md](./calculations.md).

Notes on specific values:

- `monthly` uses a multiplier of 0.23, which approximates 1 occurrence per month expressed as a fraction of a week (approximately 52 weeks / 12 months ÷ 52 × 12 = 0.2308, rounded to 0.23).
- `quarterly` uses a multiplier of 0.077, which approximates 4 occurrences per year expressed weekly.
- `adhoc` uses a multiplier of 0.3, representing a best-estimate average frequency for genuinely unpredictable work. Engineers selecting this value are acknowledging that frequency is uncertain.

---

## Energy (energy)

The `energy` field on an Activity describes how the activity feels to perform. It has exactly four valid values.

| Wire Value | Long Label | Short Label | Subtitle | Perceived-cost multiplier |
|---|---|---|---|---|
| `energizing` | Energizes me | Energizes | I like doing it | 0.5 |
| `fine` | It's fine | Fine | No complaints | 1.0 |
| `tedious` | Tedious | Tedious | Rather skip it | 1.5 |
| `draining` | Drains me | Drains | I dread it | 2.0 |

Field usage:

- **Long Label** is used in selection controls, expanded card views, and exports.
- **Short Label** is used in compact activity card displays and the Y-axis legend of the matrix.
- **Subtitle** is used beneath the long label in the submission form.
- **Perceived-cost multiplier** is used to compute perceived cost. See [calculations.md](./calculations.md).

### Design Mock vs. Implementation Note

The original design mockups for this product use a three-value energy scale: `energizing`, `neutral`, `draining`. The implementation uses the four-value scale above: `energizing`, `fine`, `tedious`, `draining`. The implementation wire format is authoritative. The `fine` value maps to what the design mocks called `neutral`. Any AI skill or MCP tool output referencing the design-mock terminology must translate `neutral` to `fine` when reading or writing activity data.

---

## Team Automatability Verdict (teamAuto)

The `teamAuto` field on an Activity records the team's collective judgment about whether the activity can or should be automated. It has exactly four valid values. Only the facilitator may change this field from its default.

| Wire Value | Long Label | Short Label | Tone/Color |
|---|---|---|---|
| `yes` | Automatable | Auto | rust (red-orange) |
| `maybe` | Maybe | Maybe | amber (yellow-orange) |
| `no` | Manual forever | Manual | slate (blue-gray) |
| `unclassified` | Needs review | Unclassified | ghost (transparent / muted) |

Field usage:

- **Long Label** is used in the grouped view headers, expanded card views, and exports.
- **Short Label** is used on compact activity cards and classification buttons.
- **Tone/Color** describes the visual treatment applied to the classification badge. These are design-system color roles, not specific hex values:
  - `rust`: A red-orange hue indicating urgency or actionability (automatable = high priority to act). Applied via the `is-rust` chip modifier class.
  - `amber`: A yellow-orange hue indicating uncertainty or investigation needed. Applied via the `is-amber` chip modifier class.
  - `slate`: A blue-gray hue indicating manual/permanent work. Applied via the `is-slate` chip modifier class (`--slate-bg` background, dark slate text). Used for the `no` verdict.
  - `ghost`: Transparent background, transparent border, `--muted` text color. The label text inside the ghost chip is additionally rendered at 50% opacity via inline style to indicate absence of verdict. Applied via the `is-ghost` chip modifier class. Used for `unclassified`.

The default value `unclassified` is set on all new activities. Activities in `unclassified` state appear first in the discuss view's pending queue (sorted by perceived cost descending). Once classified, they move to the appropriate group.

---

## Role

The `role` field on a Participant describes the participant's functional role within their engineering team. It has exactly five valid values.

| Wire Value | Description |
|---|---|
| `IC` | Individual Contributor — a software engineer, SRE, or other individual technical contributor. This is the default role. |
| `EM` | Engineering Manager — a manager who may also contribute technically. |
| `PM` | Product Manager — a product owner or product manager embedded in the team. |
| `UX` | UX Designer — a designer or researcher embedded in or partnering with the team. |
| `Other` | Any other functional role not covered by the above categories. |

The role is set at join time and is not changeable during the session in the current implementation. It is displayed in the participant roster and in the export, where it can be used to segment or filter activity reports by submitter role.

The default role is `IC`. If a participant joins without specifying a role, `IC` is assumed.
