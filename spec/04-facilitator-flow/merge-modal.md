# Merge Modal

**Trigger:** Clicking the "⇄ merge" facilitator action button on any activity card in any view (live view, matrix view, grouped view, or discuss view).

The merge modal allows the facilitator to combine two or more activities that represent the same recurring work reported by different engineers. The result is a single merged activity. The original source activities are kept and marked as `isMergedSource: true` — they remain visible (dimmed) so the team can trace back to what was submitted.

---

## Presentation

| Property | Value |
|---|---|
| Type | Modal dialog overlaid on the current view |
| Width | 900px |
| Maximum height | 90% of viewport height |
| Background overlay | Semi-transparent dark overlay with 2px backdrop blur |
| Close button | "×" in the top-right corner; closes the modal without merging |

---

## Modal Header

| Element | Description |
|---|---|
| Eyebrow | In rust color: "↳ Facilitator action · merge activities" |
| Heading | "Select cards to merge — a new card is created, originals are kept." |
| Close button | "×" top-right |

---

## Two-Column Body

The modal body uses a two-column layout of equal width:

| Column | Content |
|---|---|
| Left | Candidate checklist — source card + searchable candidate list |
| Right | Editable merged card preview |

---

## Left Column — Candidate Checklist

### Eyebrow

"Select cards to merge · {N} selected" — N updates as checkboxes are toggled.

### Source Card (Always Selected)

The activity on which the facilitator clicked "merge" is always pre-selected and cannot be deselected. It is shown as a fixed item at the top with:

| Element | Description |
|---|---|
| Checkbox | Pre-checked, filled dark, always on |
| Avatar | Small colored circle with initials |
| Title | Activity title, truncated with ellipsis |
| Metadata line | "{first name} · {TPO_SHORT} · {FREQ_SHORT}" in monospace |
| Badge | "starting card" ghost chip at right |

### Search Input

An auto-focused text input with a "⌕" icon prefix and an "×" clear button (shown when search has content). The placeholder text is exactly: `"Search other activities…"`. Filters the candidate list by title text OR participant name (case-insensitive substring match).

### Candidate List

Candidates are all other activities in the session that are NOT `isMergedSource: true`, sorted by similarity score descending. Candidates are computed client-side when the merge modal opens — no network call is made.

**Similarity formula:**

```
tokenize(title) = lowercase, remove non-word chars, split on whitespace, filter to words with length > 2
sem = Jaccard similarity (intersection / union) on word sets
similarity = 0.85 × sem + 0.10 × (same freq ? 1 : 0) + 0.05 × (same tpo ? 1 : 0)
```

**Candidate card display:**

| Element | Description |
|---|---|
| Checkbox | Filled dark when selected, empty when not |
| Avatar | Small colored circle with initials |
| Title | Activity title, truncated with ellipsis |
| Metadata line | "{first name} · {TPO_SHORT} · {FREQ_SHORT}" in monospace |
| Similarity badge | Shown only when `similarity > 0.15`; percentage score (e.g., "34%") |

**Similarity badge color:**

| Score range | Badge class |
|---|---|
| > 60% | `is-rust` |
| > 30% | `is-amber` |
| ≤ 30% | No accent (default chip style) |

**Empty search state:** "No activities match '{search}'." in italic muted text.

Clicking a candidate card toggles its checkbox. The source card is always implicitly included and cannot be deselected.

---

## Right Column — Editable Merged Card

An eyebrow label at the top of the right column reads: "Merged card — edit before creating".

### Stacked Avatars + Author Line

Shows all selected activities' avatars in a horizontally stacked row (each offset 8px left of the previous, with a 2px white border between them). Below the avatars: "{first name} + {first name} + …" for all selected activities.

A chip at the right shows: "⇄ {N} cards · ~{total h/wk:.1f} h/wk" in sage style. Total h/wk is the sum of `calcEffort(tpo, freq).hrs` for all selected activities.

### Editable Fields

**Title:**

| Property | Value |
|---|---|
| Label | "Title" |
| Type | Text input at 14px bold |
| Pre-filled | The source activity's title |
| Placeholder | "Describe the merged activity…" |

**Time per occurrence (4 buttons in a 4-column grid):**

| Button value | Button label |
|---|---|
| `<30m` | "< 30 min" |
| `30m-2h` | "30 min – 2 hrs" |
| `half-day` | "Half a day" |
| `day+` | "Full day+" |

Pre-selected to the source activity's `tpo`. Selected button has dark background and white text.

**Frequency (5 buttons in a 5-column grid):**

| Button value | Button label |
|---|---|
| `daily` | "Daily" |
| `weekly` | "Weekly" |
| `monthly` | "Monthly" |
| `quarterly` | "Quarterly" |
| `adhoc` | "Ad hoc" |

Pre-selected to the source activity's `freq`.

**Energy (4 buttons in a 3-column grid — row of 3 + row of 1):**

| Button value | Button label |
|---|---|
| `energizing` | "Energizes" |
| `fine` | "Fine" |
| `tedious` | "Tedious" |
| `draining` | "Drains" |

Pre-selected to the source activity's `energy`.

### Originals Note

A footer note in muted text at the bottom of the right column:

> "↳ Original cards are kept and linked to this merged card so you can trace back to what was submitted."

---

## Modal Footer

| Element | Description |
|---|---|
| Status text | "Creating 1 merged card from {N} originals." when 2+ selected, or "Select at least one more card to merge." when fewer than 2 |
| Cancel button | Ghost button "Cancel" — closes the modal without merging |
| Merge button | "⇄ Create merged card →" in rust style; disabled when fewer than 2 activities are selected (`selected.size < 2`) |

---

## Merge Execution

When "⇄ Create merged card →" is clicked:

1. Validates that `selected.size >= 2`.
2. Emits socket event `activity:merge` with payload:
   - `sessionId`
   - `sourceIds`: array of all selected activity IDs (including the source card)
   - `title`, `tpo`, `freq`, `energy`: the values from the editable fields
   - `token`
3. Closes the modal by setting `mergeSource` to null.

On receipt of the server's `activity:merged` event (with `{ newActivity, updatedSources }`), the client removes all updated source activities from its state and replaces them with the server-returned updated versions, then adds the new merged activity.

---

## Cross-References

- This modal is triggered from: [live-view.md](./live-view.md), [matrix-view.md](./matrix-view.md), [grouped-view.md](./grouped-view.md), [discuss-view.md](./discuss-view.md)
- Edit modal (alternative action): [edit-modal.md](./edit-modal.md)
- Similarity formula details: `../10-business-rules/merge-rules.md`
