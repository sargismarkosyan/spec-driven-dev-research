# Merge Feature Spec — No Technical Interfaces

Socket events and REST endpoints removed. All other categories present.

---

## Product Context

The merge feature allows the facilitator to combine two or more activities that represent the same recurring work reported by different engineers into a single consolidated activity. This reduces duplication in the discussion phase and gives a clearer picture of shared team pain points.

Merge is initiated by the facilitator only. Engineers have no merge capability. Merge is permanent — there is no undo.

---

## Data Model

### Merge Tracking Fields — Merged Result Activity

| Field | Type | Description |
|---|---|---|
| `mergedFromIds` | String[] | IDs of all source activities |
| `mergedFromNames` | String[] | Display names of source authors |
| `mergedFromInitials` | String[] | Initials of source authors |
| `mergedFromColors` | String[] | Hex colors of source authors |
| `reportedBy` | String[] | Display names of all reporters across all sources |
| `reportedByInitials` | String[] | Initials for all reporters |
| `reportedByColors` | String[] | Hex colors for all reporters |

### Merge Tracking Fields — Source Activities

| Field | Type | Description |
|---|---|---|
| `isMergedSource` | Boolean | `true` after being consumed by a merge |
| `mergedIntoId` | String | ID of the merged result that consumed this source |

### ID Format

- Engineer-submitted activities: full version-4 UUID
- Merged result activities: 8-character truncated UUID (first 8 characters of a random v4 UUID)

### teamAuto on Merged Result

Always set to `unclassified`. Must be re-classified during discussion.

### editHistory on Merged Result

Initialized as an empty array. No creation entry added.

---

## UI

### Trigger

A "⇄ merge" action button appears on activity cards in: live view, matrix view, grouped view, and discuss view. Clicking it opens the merge modal with that activity pre-selected as the source.

### Merge Modal

**Presentation:**

| Property | Value |
|---|---|
| Type | Modal dialog overlaid on the current view |
| Width | 900px |
| Maximum height | 90% of viewport height |
| Background overlay | Semi-transparent dark overlay with 2px backdrop blur |
| Close button | "×" top-right; closes without merging |

**Header:**

| Element | Description |
|---|---|
| Eyebrow | In rust color: "↳ Facilitator action · merge activities" |
| Heading | "Select cards to merge — a new card is created, originals are kept." |

**Two-column body** — equal width:

| Column | Content |
|---|---|
| Left | Candidate checklist — source card + searchable candidate list |
| Right | Editable merged card preview |

**Left column — Source card (always selected):**

Pre-checked, filled dark checkbox. Cannot be deselected. Shows avatar, title, metadata line ("{first name} · {TPO_SHORT} · {FREQ_SHORT}" in monospace), and "starting card" ghost chip.

Eyebrow: "Select cards to merge · {N} selected" — updates as checkboxes toggled.

**Left column — Search input:**

Auto-focused. Placeholder: `"Search other activities…"`. Filters by title OR participant name (case-insensitive).

**Left column — Candidate list:**

All non-`isMergedSource` activities except the source card, sorted by similarity descending. Computed client-side — no network call.

Each candidate shows: checkbox, avatar, title, metadata, similarity badge (shown only when `similarity > 0.15`).

Similarity badge color:

| Score | Badge class |
|---|---|
| > 60% | `is-rust` |
| > 30% | `is-amber` |
| ≤ 30% | No accent |

**Right column — Editable merged card:**

Eyebrow: "Merged card — edit before creating"

Stacked avatars + author line. Chip: "⇄ {N} cards · ~{total h/wk:.1f} h/wk".

Editable fields (pre-filled from source activity):
- Title: text input, 14px bold
- Time per occurrence: 4-button grid (`<30m`, `30m-2h`, `half-day`, `day+`)
- Frequency: 5-button grid (`daily`, `weekly`, `monthly`, `quarterly`, `adhoc`)
- Energy: 4-button grid (`energizing`, `fine`, `tedious`, `draining`)

Footer note: "↳ Original cards are kept and linked to this merged card so you can trace back to what was submitted."

**Modal footer:**

| Element | Description |
|---|---|
| Status text | "Creating 1 merged card from {N} originals." when 2+ selected; "Select at least one more card to merge." when fewer than 2 |
| Cancel | Ghost "Cancel" |
| Merge button | "⇄ Create merged card →" in rust; disabled when fewer than 2 selected |

### View Filtering

Facilitator views filter out `isMergedSource: true` activities from lists and counts:

- **Live view:** Stream and counts exclude merged sources. Merged result cards show expandable section with dimmed source cards.
- **Matrix view:** Merged sources excluded from dot rendering
- **Grouped view:** Merged sources excluded from all columns
- **Discuss view:** Merged sources excluded from tray and counts. Similar activities panel shows "⇄ merge" button.

**Exceptions:**
- Engineer board: merged sources remain visible
- REST export: merged sources included

---

## Design System

### Similarity Badge Colors

| Score | Badge class |
|---|---|
| > 0.60 | `is-rust` |
| > 0.30 | `is-amber` |
| ≤ 0.30 | No accent |

Badge only shown when `combinedScore > 0.15`.

### Modal

- Width: 900px, max height: 90vh
- Overlay: semi-transparent dark, 2px backdrop blur

### Avatar Stack

Horizontal row, each avatar offset 8px left, 2px white border between.

---

## Business Rules

### Similarity Formula

`combinedScore = 0.85 × titleSimilarity + 0.10 × (sameFreq ? 1 : 0) + 0.05 × (sameTpo ? 1 : 0)`

**Title similarity — Jaccard Index:**

Tokenization:
1. Lowercase
2. Remove all non-alphanumeric characters
3. Split into words
4. Discard words with length ≤ 2 characters

Jaccard = `|intersection| / |union|`. If both sets empty, similarity = 0.

Candidate list computed client-side. Display threshold: `combinedScore > 0.15`.

### Merged Result Record

| Field | Value |
|---|---|
| `id` | 8-char truncated UUID |
| `participantId/Name/Initials/Color` | Copied from first source activity |
| `title`, `tpo`, `freq`, `energy` | From merge payload |
| `teamAuto` | Always `unclassified` |
| `flagged` | false |
| `discussionNote` | Empty string |
| `editHistory` | Empty array |
| `mergedFromIds/Names/Initials/Colors` | Aggregated from all sources |
| `reportedBy/Initials/Colors` | Aggregated from all source reporters |

### Source Activity Mutation

Each source updated (not deleted):
- `isMergedSource` → `true`
- `mergedIntoId` → ID of merged result

Remain in `activities` map. Hidden from facilitator views. Visible on engineer board and in export.

**Live view exception:** Merged result card expandable to show source cards dimmed.

### Permanence

Merge is permanent. No unmerge. Flag permanent for session lifetime.

### Prerequisites

1. At least 2 source IDs
2. Valid facilitator token
3. All source IDs must exist in the session

### Classification Reset

Merged result always reset to `unclassified`. Team must re-classify.
