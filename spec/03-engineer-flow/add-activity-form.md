# Add Activity Form

The add-activity form is the inline form used during the active phase to create a new activity. It appears in the center panel of the board, replacing or appearing below the add button.

**Trigger:** Clicking the "Add your first activity" card (zero activities state) or the "Add another activity" button (one or more activities state), or clicking a prompt example in the prompt rail, or clicking a suggestion item in the suggestions sidebar.

---

## Form Header (Context Eyebrow)

The eyebrow "Submitting as {name} · {N} activities" is always displayed above the center panel. It is NOT specific to the form being open — it is a persistent label showing submission context. When the form is open, this eyebrow still shows the current submitted count (not the in-progress form).

---

## Form Card

The form is presented as a white card with a drop shadow.

> **Automatability exclusion:** The add-activity form does not contain any reference to automatability. A note like "Automatable? Not asked here — the team decides together during discussion" must NOT appear inside the form card. This information is already conveyed by the overall session flow and does not belong on the submission form.

### Activity Title Field

| Property | Value |
|---|---|
| Label | "What's the activity?" |
| Input type | Large text input (16px) |
| Auto-focus | Yes — the title field receives focus automatically when the form opens |
| Placeholder | "Triage Sentry alerts each morning" |
| Helper text | Displayed below the input: "↳ One activity per card · be specific but quick" (monospace arrow prefix, muted-2 color) |
| Pre-fill behavior | When the form is opened via a prompt example: title, tpo, and freq are pre-filled; energy is not. When opened via a suggestion: only the title is pre-filled |

---

### Three Question Blocks

Each question block is numbered (01, 02, 03) and contains a sequence number, a bold question, an italic hint, and a row of option buttons.

#### Question 01 — Time per Occurrence

| Property | Value |
|---|---|
| Sequence label | "01" in monospace |
| Question | "How long does this take, each time?" in bold |
| Hint | "Honest average — including the 'just one more thing' stretch" in italic |

Options (displayed as a row of buttons):

| Option label | Monospace subtitle |
|---|---|
| Under 30 min | Short descriptor |
| 30 min – 2 hrs | Short descriptor |
| Half day | Short descriptor |
| A full day or more | Short descriptor |

#### Question 02 — Frequency

| Property | Value |
|---|---|
| Sequence label | "02" in monospace |
| Question | "How often does it happen?" in bold |
| Hint | "Roughly — pick the nearest cadence" in italic |

Options (displayed as a row of buttons):

| Option label | Monospace subtitle |
|---|---|
| Daily | Short descriptor |
| Weekly | Short descriptor |
| Monthly | Short descriptor |
| Quarterly | Short descriptor |
| Ad hoc | Short descriptor |

#### Question 03 — Energy

| Property | Value |
|---|---|
| Sequence label | "03" in monospace |
| Question | "How does it feel to do?" in bold |
| Hint | "Gut check — energy is fine to share honestly" in italic |

Options (displayed as a row of buttons):

| Option label | Monospace subtitle |
|---|---|
| Energizes me | Short descriptor |
| Fine | Short descriptor |
| Tedious | Short descriptor |
| Drains me | Short descriptor |

#### Option Button States

| State | Visual style |
|---|---|
| Selected | Dark background (ink color) with cream text |
| Unselected | White background with ink-colored border |

#### Default Values

When the form opens blank (not pre-filled from a prompt or suggestion), the three questions have the following default selections:

| Question | Default value |
|---|---|
| Time per occurrence | `30m-2h` ("30 min – 2 hrs") |
| Frequency | `weekly` ("Weekly") |
| Energy | `fine` ("Fine") |

These defaults match the most common type of recurring work and reduce the number of interactions required for typical submissions.

#### Pre-fill Behavior from Prompts and Suggestions

- **Prompt rail example:** Title, tpo, and freq are pre-filled from the example's `{ title, tpo, freq }` object. Energy is not pre-filled — the engineer must select it manually.
- **Suggestion click:** Only the title field is pre-filled (with the suggestion title string). The tpo, freq, and energy questions remain at their defaults.

---

### Divider

A horizontal rule separating the question blocks from the footer buttons.

---

### Footer Buttons

Three actions are available in the form footer:

| Button | Style | Position | Action |
|---|---|---|---|
| "Save activity" | Primary | Left | Validates the form; saves the activity; closes the form and returns to the activity list |
| "Save & add another" | Secondary | Center | Validates the form; saves the activity; immediately opens a new blank form for the next activity |
| "Esc · cancel" | Text / right-aligned | Right | Cancels the form without saving; returns to the activity list |

---

## Keyboard Behavior

| Key | Action |
|---|---|
| Escape | Cancels the form; closes it without saving; returns to the activity list |

---

## Validation Rules

| Rule | Behavior |
|---|---|
| Title field is empty | The "Save activity" and "Save & add another" buttons are disabled; the form cannot be submitted |
| All three questions must have a selection | The form requires answers to all three questions before it can be saved |

---

## Save Behavior

When the form is saved successfully:

- The activity is submitted via the socket/API with the title, tpo, freq, and energy values.
- If "Save activity": the form closes and the activity list is shown with the new activity appended.
- If "Save & add another": a new blank form opens immediately with the title field auto-focused and all three question selections cleared (no option pre-selected). See [board-active.md](./board-active.md) for the full reset behavior specification.

---

## Cross-References

- Form is embedded in the center panel of the active board: [board-active.md](./board-active.md)
- Prompt examples that pre-fill this form come from: [prompt-rail.md](./prompt-rail.md)
- Suggestions that pre-fill this form come from: [suggestions.md](./suggestions.md)
- Enumeration values for tpo, freq, and energy: `../02-data-model/enumerations.md`
