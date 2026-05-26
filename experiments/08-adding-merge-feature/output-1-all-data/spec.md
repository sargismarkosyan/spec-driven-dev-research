# Merge Feature Spec — Full (All Data)

All spec content relevant to the merge feature. No categories removed.

---

## Product Context

The merge feature allows the facilitator to combine two or more activities that represent the same recurring work reported by different engineers into a single consolidated activity. This reduces duplication in the discussion phase and gives a clearer picture of shared team pain points.

Merge is initiated by the facilitator only. Engineers have no merge capability. Merge is permanent — there is no undo.

---

## Data Model

### Merge Tracking Fields — Merged Result Activity

These fields are present only on the merged result. Absent on ordinary activities.

| Field | Type | Description |
|---|---|---|
| `mergedFromIds` | String[] | IDs of all source activities merged into this result |
| `mergedFromNames` | String[] | Display names of the authors of each source, matching order of `mergedFromIds` |
| `mergedFromInitials` | String[] | Initials of the authors of each source |
| `mergedFromColors` | String[] | Hex colors of the authors of each source |
| `reportedBy` | String[] | Display names of all reporters across all sources |
| `reportedByInitials` | String[] | Initials for all reporters in same order as `reportedBy` |
| `reportedByColors` | String[] | Hex colors for all reporters in same order as `reportedBy` |

### Merge Tracking Fields — Source Activities

Set on source activities when consumed by a merge.

| Field | Type | Description |
|---|---|---|
| `isMergedSource` | Boolean | Set to `true` at merge time. Suppresses source from facilitator list views. |
| `mergedIntoId` | String | ID of the merged result activity that consumed this source. |

### ID Format

- Engineer-submitted activities: full version-4 UUID
- Merged result activities: 8-character truncated UUID (first 8 characters of a random v4 UUID)

### teamAuto on Merged Result

Always set to `unclassified` — not copied from any source. Must be re-classified during discussion.

### editHistory on Merged Result

Initialized as an empty array. No creation entry is added for merged results.

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

Pre-checked, filled dark checkbox. Cannot be deselected. Shows avatar (colored circle with initials), activity title, metadata line ("{first name} · {TPO_SHORT} · {FREQ_SHORT}" in monospace), and a "starting card" ghost chip.

Eyebrow above list: "Select cards to merge · {N} selected" — updates as checkboxes are toggled.

**Left column — Search input:**

Auto-focused. "⌕" icon prefix, "×" clear button. Placeholder: `"Search other activities…"`. Filters candidates by title OR participant name (case-insensitive substring).

**Left column — Candidate list:**

All non-`isMergedSource` activities except the source card, sorted by similarity score descending. Computed client-side when modal opens — no network call.

Each candidate card shows: checkbox, avatar, title, metadata line, and a similarity badge (shown only when `similarity > 0.15`; displays as percentage e.g. "34%").

Similarity badge color:

| Score | Badge class |
|---|---|
| > 60% | `is-rust` |
| > 30% | `is-amber` |
| ≤ 30% | No accent (neutral chip) |

Empty search state: "No activities match '{search}'." in italic muted text.

**Right column — Editable merged card:**

Eyebrow: "Merged card — edit before creating"

Stacked avatars (each offset 8px left, 2px white border between) + author line: "{first name} + {first name} + …". Chip at right: "⇄ {N} cards · ~{total h/wk:.1f} h/wk" in sage style.

Editable fields (pre-filled from source activity):
- Title: text input, 14px bold
- Time per occurrence: 4-button grid (`<30m`, `30m-2h`, `half-day`, `day+`)
- Frequency: 5-button grid (`daily`, `weekly`, `monthly`, `quarterly`, `adhoc`)
- Energy: 4-button grid in 3-column layout (`energizing`, `fine`, `tedious`, `draining`)

Footer note: "↳ Original cards are kept and linked to this merged card so you can trace back to what was submitted."

**Modal footer:**

| Element | Description |
|---|---|
| Status text | "Creating 1 merged card from {N} originals." when 2+ selected; "Select at least one more card to merge." when fewer than 2 |
| Cancel button | Ghost button "Cancel" |
| Merge button | "⇄ Create merged card →" in rust style; disabled when `selected.size < 2` |

**Merge execution:**

1. Validates `selected.size >= 2`
2. Emits socket event `activity:merge` with `{ sessionId, sourceIds, title, tpo, freq, energy, token }`
3. Closes the modal
4. On receiving `activity:merged`: removes source activities from display, replaces with server-returned updated versions, adds the new merged activity

### View Filtering

The following facilitator views filter out `isMergedSource: true` activities from lists and counts:

- **Live view:** Activity stream and topbar counts exclude merged sources. Merged result cards show an expandable section revealing source cards in a dimmed state.
- **Matrix view:** Merged sources excluded from dot rendering
- **Grouped view:** Merged sources excluded from all three columns
- **Discuss view:** Merged sources excluded from pending tray and progress bar denominator. Similar activities panel on each card shows a "⇄ merge" button.

**Exceptions — do not filter:**
- Engineer board: merged sources remain visible to the original author
- REST export: merged sources are included

---

## Technical Interfaces

### Socket — activity:merge (client → server)

Facilitator only.

| Field | Type | Required |
|---|---|---|
| sessionId | string | Yes |
| sourceIds | string[] | Yes — at least 2 IDs |
| title | string | No — default derived if omitted |
| tpo | string | Yes |
| freq | string | Yes |
| energy | string | Yes |
| token | string | Yes |

Server creates merged activity, marks all sources, broadcasts `activity:merged` to room.

### Socket — activity:merged (server → client)

Broadcast to all participants.

| Field | Description |
|---|---|
| newActivity | Full merged activity record |
| updatedSources | Source records now marked `isMergedSource: true` and `mergedIntoId` |

Client: remove sources from display, add `newActivity`, update sources in local state for traceability rendering.

### REST — GET /api/sessions/:id/activities/:aid/merge-candidates

Returns up to 5 similar activities sorted by score. Not called by the browser — client computes candidates locally. Exists for programmatic access.

Response includes full activity fields plus `sem`, `sameFreq`, `sameTpo`, `similarity`.

Only activities with `similarity > 0.15` included.

### REST — POST /api/sessions/:id/activities/merge

| Field | Required |
|---|---|
| token | Yes |
| sourceIds (min 2) | Yes |
| title | No |
| tpo, freq, energy | Yes |

Errors: 400 if fewer than 2 source IDs, 403 token mismatch, 404 not found.

Response: `{ newActivity, updatedSources }`. Broadcasts `activity:merged` to room.

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

Display threshold: only show badge when `combinedScore > 0.15`.

Candidate list is computed client-side — no network call when modal opens.

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

Each source activity is updated (not deleted):
- `isMergedSource` → `true`
- `mergedIntoId` → ID of merged result

Source activities remain in the `activities` map. Hidden from facilitator list views. Visible on engineer board and in REST export.

**Live view exception:** Merged result card can be expanded to reveal source cards in a dimmed state.

### Permanence

Merge is permanent. No unmerge command. `isMergedSource` flag is permanent for the session lifetime.

### Prerequisites

1. At least 2 source activity IDs
2. Valid facilitator token
3. All source IDs must exist in the session

### Classification Reset

Merged result `teamAuto` always reset to `unclassified`. The consolidated framing may warrant a different verdict than any individual source — the team must re-classify.
