# Create Session

**Route:** `/` (home page)

The create-session page is the facilitator's starting point. The facilitator fills in the session name, configures submission settings, selects recall prompt categories, and creates the session. No engineer interaction occurs here.

---

## Layout

The page uses a two-column layout.

**Left column (form side)** begins with:
- An eyebrow label reading exactly: `"New session"` (monospace, uppercase, muted color)
- An h1 heading reading exactly: `"Start a work audit"` (display font)
- No additional intro paragraph inside the form column

**Right column** contains a contextual "How it works" panel:
- An eyebrow: `"How it works"` (monospace, uppercase, muted color)
- An h2 heading: `"A structured retro for recurring work"` (display font, ~24px)
- A description paragraph: `"Engineers submit activities, tag effort and energy, then the team classifies what to automate, investigate, or accept."` (muted color)

The right column background is `--paper-deep`.

---

## Page-Level Error Handling

- When the session creation API call fails: an error banner is shown at the top of the form.
- The error banner describes the failure and allows the facilitator to retry.

---

## Form Fields

### Session Name Input

| Property | Value |
|---|---|
| Label | "Session name" |
| Type | Text input |
| Required | Yes |
| Default value | "Platform team · Q2 audit" (pre-filled; the facilitator may clear and retype) |
| Validation | The create button is disabled when this field is empty |

---

### Submission Window Picker

A single-select group of five toggle buttons. Only one option may be selected at a time.

| Button label | Value sent | Description |
|---|---|---|
| 5 min | 5 | 5-minute countdown |
| 10 min | 10 | 10-minute countdown (default selected) |
| 15 min | 15 | 15-minute countdown |
| 20 min | 20 | 20-minute countdown |
| Untimed | 0 | No countdown shown to engineers |

- Default selected option: 10 min.
- Selecting "Untimed" sets the submission window value to 0; engineers do not see a countdown timer when the session is untimed.
- Explanatory note displayed below the picker: "A hint, not a lock. Engineers see countdown but submissions don't close — you can extend mid-session, or end early. Late joiners can still drop in after the round starts."

---

### Recall Prompts Category Selector

Field label: `"Prompt categories"` (exactly — not "Prompt categories shown to engineers" or any other variant).

A flex grid of category chips, each independently toggleable on or off.

| Property | Value |
|---|---|
| Default state | All 9 categories enabled |
| Chip style when enabled | Sage-bg background, solid border, "✓ " prefix before the category name |
| Chip style when disabled | Transparent background, dashed border, muted text |

Available categories (in order):

| # | Category ID | Display name |
|---|---|---|
| 1 | `yesterday` | Yesterday & this week |
| 2 | `weekly-meetings` | Weekly meetings |
| 3 | `monthly-rituals` | Monthly rituals |
| 4 | `oncall` | On-call & incidents |
| 5 | `quarterly` | Quarterly cycles |
| 6 | `manual-chores` | Manual chores |
| 7 | `handoffs` | Handoffs & coordination |
| 8 | `automate` | Things I wish we automated |
| 9 | `other` | Other recurring work |

**Shortcut buttons:**

| Button | Action |
|---|---|
| "All on" | Enables all 9 categories at once |
| "All off" | Disables all 9 categories at once |

- Only the categories that are enabled at creation time appear in the prompt rail for engineers.

---

### Live Colleague Feed Toggle

| Property | Value |
|---|---|
| Control type | Visual toggle switch |
| Default state | On |
| Visual style — on | Dark-colored toggle |
| Visual style — off | Gray-colored toggle |
| Label | "Engineers see each other's activities live" |
| Explanation text | "Transparency, not surveillance. Helps recall." |

- When on: the team feed and suggestions sections are shown to engineers during the active phase.
- When off: engineers do not see each other's activities; team feed and suggestions are hidden.

---

## Buttons

### Create Button

| Property | Value |
|---|---|
| Label | "Create session →" |
| Style | Base `wa-btn` (dark ink background, cream text) — NOT the `is-rust` variant |
| Disabled when | Session name field is empty |
| Disabled when | A creation request is currently in progress |
| Disabled when | All categories have been deselected (zero enabled categories) |

The category toggle prevents the last category from being deselected — clicking the toggle on the only remaining enabled category has no effect.

After the create button, a `wa-rule` horizontal rule is followed by a small footer note in monospace muted text: `"↳ Engineers join via link — no login, no account needed."`

**On successful creation:**

1. The facilitator token is stored in browser localStorage.
2. The page navigates to: `/session/{id}/lobby?token={token}`

> **Note:** There is no facilitator-name field on the create-session form. The `facilitatorName` field in the POST request body is sent as an empty string. The session data therefore stores an empty facilitator name.

## Cross-References

- After successful creation, the facilitator is taken to: [lobby.md](./lobby.md)
- `enabledCategories` controls which prompts appear in the engineer's prompt rail: `../03-engineer-flow/prompt-rail.md`
- `liveTeamFeed` controls team feed and suggestions visibility: `../03-engineer-flow/team-feed.md`, `../03-engineer-flow/suggestions.md`
