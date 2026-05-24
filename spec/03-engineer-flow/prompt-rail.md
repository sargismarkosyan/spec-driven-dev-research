# Prompt Rail

The prompt rail occupies the 220px left rail in the active board state. It provides recall prompts organized into thematic categories to help engineers remember all the recurring work they do — including work they might overlook.

**Visibility:** The prompt rail is only displayed when the board is in the active state. It is hidden in the lobby state and the discussion state.

---

## Rail Header

| Element | Style | Content |
|---|---|---|
| Eyebrow label | Monospace | "↳ Recall prompts" |
| Intro text | Body | "Tap an example to pre-fill a card title. Don't filter — list everything." |

---

## Category List

The rail contains a list of prompt categories. Each category is independently expandable/collapsible.

### Category Visibility

- Only categories that are present in the session's `enabledCategories` list are shown.
- Categories not in `enabledCategories` are omitted entirely from the rail.

### Default Expanded State

- The first three categories in the list default to expanded on page load.
- All subsequent categories default to collapsed on page load.

### Category Header (Expand/Collapse Toggle)

| Element | Description |
|---|---|
| Category name | Displayed as the header label |
| Toggle indicator | "▲" when the category is open; "▼" when the category is closed |
| Interaction | Clicking anywhere on the category header toggles the category between open and closed |

---

## Standard Category List

The following nine categories are available. All nine are enabled by default when a session is created (unless the facilitator disabled some at session creation time).

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

---

## Example Activities Within Categories

When a category is expanded, it shows a list of example activity titles.

### Example Item Display

| Element | Description |
|---|---|
| "+" icon | Displayed as a prefix before the activity title |
| Activity title | The example text |
| Border / background | Default state is neutral; on hover, the border and background change to signal interactivity |

### Clicking an Example

When the engineer clicks an example activity:

1. The add-activity form opens (if it is not already open).
2. The title field of the add-activity form is pre-filled with the example's text.
3. If the example includes a time-per-occurrence (tpo) value: the corresponding tpo option in the form is pre-selected.
4. If the example includes a frequency (freq) value: the corresponding freq option in the form is pre-selected.
5. Energy is NOT pre-filled from an example — the engineer must select it manually.

---

## Cross-References

- The prompt rail is embedded in the active board layout: [board-active.md](./board-active.md)
- Clicking a prompt pre-fills the add-activity form: [add-activity-form.md](./add-activity-form.md)
- `enabledCategories` is set by the facilitator at session creation: `../04-facilitator-flow/create-session.md`
