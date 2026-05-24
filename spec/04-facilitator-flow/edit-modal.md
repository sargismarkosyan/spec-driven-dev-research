# Edit Modal

**Trigger:** Clicking the "✎ edit" facilitator action button on any activity card in any view (live view, matrix view, grouped view, or discuss view).

The edit modal allows the facilitator to modify an existing activity on behalf of its original submitter. Changes to the title are attributed to the facilitator and visible to the original author.

---

## Presentation

| Property | Value |
|---|---|
| Type | Modal dialog overlaid on the current view |
| Width | ~760px |
| Maximum height | 92% of viewport height |
| Overflow | Scrollable internally when content exceeds max height |
| Background overlay | Semi-transparent overlay behind the modal |
| Background blur | The content behind the modal is blurred (`backdropFilter: blur(2px)`) |

---

## Modal Header

| Element | Description |
|---|---|
| Eyebrow | In rust color: "↳ Facilitator action · edit activity" |
| Heading | "Editing on behalf of {submitter first name}" — first name of the original submitter is substituted dynamically |
| Close button | "×" in the top-right corner; closes the modal without saving |

---

## Original Card Preview

A read-only preview of the activity as it currently stands, shown on a paper background below the header:

| Element | Description |
|---|---|
| Avatar | Small avatar with submitter's initials and color |
| Eyebrow | "↳ ORIGINAL · {submitter full name}" in monospace (no timestamp) |
| Title | The current activity title in quotes (e.g., `"Sprint planning meeting"`), truncated with ellipsis if very long |
| Effort pill | A small effort pill (right-aligned) showing the current computed effort |

---

## Editable Fields

### Title Field

| Property | Value |
|---|---|
| Label | "Activity" |
| Type | Text input |
| Pre-filled value | The current activity title |
| Helper note | In monospace: "changes are visible to the original author with an 'edited by {facilitator name}' footnote" |

### Three Attribute Fields

Each attribute field has a label and a row of segmented buttons. The currently set value is pre-selected.

**Time per Occurrence (tpo):**

| Property | Value |
|---|---|
| Label | Time per occurrence label |
| Options | 4 buttons matching the add-activity form tpo options |
| Pre-selected | The activity's current tpo value |

**Frequency (freq):**

| Property | Value |
|---|---|
| Label | Frequency label |
| Options | 5 buttons matching the add-activity form freq options |
| Pre-selected | The activity's current freq value |

**Energy:**

| Property | Value |
|---|---|
| Label | "Energy" |
| Options | 4 buttons: "Energizes" (`energizing`), "Fine" (`fine`), "Tedious" (`tedious`), "Drains" (`draining`) |
| Pre-selected | The activity's current energy value |

### Divider

A horizontal rule separating the core activity fields from the verdict and annotation fields.

### Team Verdict Field

| Property | Value |
|---|---|
| Label | "Team verdict · automatability" + note "set during discussion" |
| Options | Three buttons: "Automatable" (rust background when active), "Maybe" (amber background when active), "Manual forever" (dark background when active) |
| Pre-selected | The activity's current `teamAuto` value |

Button labels must use the long-form display names — not the wire values. Rendering 'Yes' / 'No' instead of 'Automatable' / 'Manual forever' is incorrect.

### Discussion Note Field

| Property | Value |
|---|---|
| Label | "Discussion note (optional)" |
| Type | Textarea |
| Resize | Vertical resize handle available |
| Pre-filled | The current discussion note, if one has been set |
| Placeholder | `'Add context for the team…'` |
| Required | No |

### Flagged Indicator (Conditional)

Shown only when the activity is currently flagged (`activity.flagged === true`). This is an informational indicator only — there is no "Unflag" button inside the edit modal:

| Element | Description |
|---|---|
| Card background | Rust-tinted background (`--rust-bg`) with rust border |
| Star icon | "★" in `--flag` color at 16px |
| Text | "Flagged for next quarter" in bold rust-colored text |
| Subtext | "Will appear in the priority export" in slightly muted rust text |

### Edit History (Collapsible)

Shown only when `activity.editHistory` exists and has at least one entry. Rendered as an HTML `<details>` element:

| Element | Description |
|---|---|
| Summary (collapsed) | "↳ EDIT HISTORY · {N} entries" followed by a "▾" chevron — clicking toggles expanded state |
| Expanded content | A box with paper background; one line per history entry in monospace |

Each history entry line:

| Element | Description |
|---|---|
| Timestamp | The entry's `at` field formatted as `toLocaleTimeString()` |
| Actor | The `who` field (facilitator name or engineer name) |
| Description | The `what` field (e.g., "tagged → yes", "edited title") |

---

## Modal Footer

The footer contains three actions:

| Button | Position | Style | Action |
|---|---|---|---|
| "× Remove activity" | Left | Rust text with soft rust border (destructive) | Removes the activity entirely from the session |
| "Cancel" | Center | Ghost | Closes the modal without saving any changes |
| "Save changes" | Right | Primary | Saves all changes (see "Save Behavior" below) |

---

## Save Behavior

When "Save changes" is clicked, the modal emits one or more socket events depending on which fields were modified:

| Changed field(s) | Socket event emitted |
|---|---|
| Title, tpo, freq, or energy | `activity:update` with the updated field values |
| `teamAuto` (team verdict) | `activity:classify` with the new verdict |
| Discussion note | `activity:note` with the note content |

- Multiple events may be emitted in the same save operation if multiple field categories were changed.
- After successful save, the modal closes and the underlying view reflects the updated activity.

---

## Cross-References

- This modal is triggered from: [live-view.md](./live-view.md), [matrix-view.md](./matrix-view.md), [grouped-view.md](./grouped-view.md), [discuss-view.md](./discuss-view.md)
- Attribute option values (tpo, freq, energy): `../02-data-model/enumerations.md`
- Merge modal (alternative action): [merge-modal.md](./merge-modal.md)
