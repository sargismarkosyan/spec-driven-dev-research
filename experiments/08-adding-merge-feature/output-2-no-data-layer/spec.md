# Merge Feature Spec — No Data Layer

Data model section removed. All other categories present.

---

## Product Context

The merge feature allows the facilitator to combine two or more activities that represent the same recurring work reported by different engineers into a single consolidated activity. This reduces duplication in the discussion phase and gives a clearer picture of shared team pain points.

Merge is initiated by the facilitator only. Engineers have no merge capability. Merge is permanent — there is no undo.

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

Pre-checked, filled dark checkbox. Cannot be deselected. Shows avatar, title, metadata line ("{first name} · {TPO_SHORT} · {FREQ_SHORT}" in monospace), and a "starting card" ghost chip.

Eyebrow: "Select cards to merge · {N} selected" — updates as checkboxes are toggled.

**Left column — Search input:**

Auto-focused. Placeholder: `"Search other activities…"`. Filters by title OR participant name (case-insensitive substring).

**Left column — Candidate list:**

All non-merged-source activities except the source card, sorted by similarity score descending. Computed client-side — no network call.

Each candidate shows: checkbox, avatar, title, metadata, and similarity badge (shown only when `similarity > 0.15`; displays as percentage).

Similarity badge color:

| Score | Badge class |
|---|---|
| > 60% | `is-rust` |
| > 30% | `is-amber` |
| ≤ 30% | No accent |

**Right column — Editable merged card:**

Editable fields (pre-filled from source activity):
- Title: text input
- Time per occurrence: 4-button grid (`<30m`, `30m-2h`, `half-day`, `day+`)
- Frequency: 5-button grid (`daily`, `weekly`, `monthly`, `quarterly`, `adhoc`)
- Energy: 4-button grid (`energizing`, `fine`, `tedious`, `draining`)

**Modal footer:**

| Element | Description |
|---|---|
| Status text | "Creating 1 merged card from {N} originals." when 2+ selected; "Select at least one more card to merge." when fewer than 2 |
| Cancel button | Ghost "Cancel" |
| Merge button | "⇄ Create merged card →"; disabled when fewer than 2 selected |

**Merge execution:**

1. Validates at least 2 selected
2. Emits `activity:merge` with `{ sessionId, sourceIds, title, tpo, freq, energy, token }`
3. Closes the modal
4. On `activity:merged`: removes source activities from display, adds new merged activity, updates sources in local state

### View Filtering

Facilitator views filter out merged source activities from lists and counts:

- **Live view:** Stream and topbar counts exclude merged sources. Merged result cards show an expandable section with source cards in dimmed state.
- **Matrix view:** Merged sources excluded from dot rendering
- **Grouped view:** Merged sources excluded from all columns
- **Discuss view:** Merged sources excluded from tray and counts. Similar activities panel shows "⇄ merge" button.

**Exceptions:**
- Engineer board: merged sources remain visible
- REST export: merged sources included

---

## Technical Interfaces

### Socket — activity:merge (client → server)

Facilitator only.

| Field | Type | Required |
|---|---|---|
| sessionId | string | Yes |
| sourceIds | string[] | Yes — at least 2 |
| title | string | No |
| tpo | string | Yes |
| freq | string | Yes |
| energy | string | Yes |
| token | string | Yes |

Server creates merged activity, marks all sources, broadcasts `activity:merged`.

### Socket — activity:merged (server → client)

Broadcast to all participants.

| Field | Description |
|---|---|
| newActivity | Full merged activity record |
| updatedSources | Source records now marked as merged |

Client: remove sources from display, add `newActivity`, update sources in local state.

### REST — GET /api/sessions/:id/activities/:aid/merge-candidates

Returns up to 5 similar activities sorted by score. Not called by the browser — exists for programmatic access.

### REST — POST /api/sessions/:id/activities/merge

| Field | Required |
|---|---|
| token | Yes |
| sourceIds (min 2) | Yes |
| title | No |
| tpo, freq, energy | Yes |

Errors: 400 fewer than 2 sources, 403 token mismatch, 404 not found.

Response: `{ newActivity, updatedSources }`. Broadcasts `activity:merged`.

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

Display threshold: badge only shown when `combinedScore > 0.15`. Candidates computed client-side.

### Merged Result Record

| Field | Value |
|---|---|
| `participantId/Name/Initials/Color` | Copied from first source activity |
| `title`, `tpo`, `freq`, `energy` | From merge payload |
| `teamAuto` | Always `unclassified` |
| `flagged` | false |
| `discussionNote` | Empty string |
| `editHistory` | Empty array |

### Source Activity Mutation

Each source activity is updated (not deleted). Marked as consumed by the merge. Source activities remain in the `activities` map but hidden from facilitator list views. Visible on engineer board and in REST export.

**Live view exception:** Merged result card can be expanded to show source cards in a dimmed state.

### Permanence

Merge is permanent. No unmerge. Flag is permanent for session lifetime.

### Prerequisites

1. At least 2 source activity IDs
2. Valid facilitator token
3. All source IDs must exist in the session

### Classification Reset

Merged result is always reset to unclassified and must be re-classified by the team.
