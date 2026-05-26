# Merge Feature — Layer 4: Problem Statement + Business Rules + UI Guidance + Data Layer

Add a merge feature to this application. The feature should allow the facilitator to combine similar activities submitted by different engineers into a single consolidated activity.

---

## Business Rules

### Similarity Formula

`combinedScore = 0.85 × titleSimilarity + 0.10 × (sameFreq ? 1 : 0) + 0.05 × (sameTpo ? 1 : 0)`

Title similarity is the dominant factor (85%). Frequency match contributes 10%. TPO match contributes 5%.

**Title similarity: Jaccard Index**

Tokenization:
1. Convert to lowercase
2. Remove all non-alphanumeric characters
3. Split into words
4. Discard words with length ≤ 2 characters

Jaccard index: `|intersection of word sets| / |union of word sets|`

If both word sets are empty after tokenization, title similarity is 0.

**Display threshold:** Only show similarity badge when `combinedScore > 0.15`. Activities below this threshold are not shown as candidates.

**Candidate computation:** Client-side when merge modal opens — no network call.

### Merged Result Record

When merge completes, the server creates a new activity with:

- `id`: 8-character truncated UUID (first 8 chars of a random v4 UUID)
- `participantId`, `participantName`, `participantInitials`, `participantColor`: copied from the first source activity
- `title`, `tpo`, `freq`, `energy`: from the merge payload
- `teamAuto`: always set to `unclassified` — must be re-classified after merge
- `flagged`: false
- `discussionNote`: empty string
- `editHistory`: empty array (no creation entry)
- `mergedFromIds`, `mergedFromNames`, `mergedFromInitials`, `mergedFromColors`: populated from all source activities
- `reportedBy`, `reportedByInitials`, `reportedByColors`: aggregated from all source activity reporters

### Source Activity Mutation

Each source activity is updated (not deleted):

- `isMergedSource`: set to `true`
- `mergedIntoId`: set to the ID of the newly created merged activity

Source activities remain in the `activities` map. They are excluded from facilitator list views via `isMergedSource`. Engineer board and REST export do NOT filter them.

### View Filtering

The following facilitator views filter out `isMergedSource: true` activities from their lists, counts, and trays:

- **Live view:** Activity stream excludes merged sources. Activity count totals exclude merged sources. Merged result cards show an expandable section revealing source cards in a dimmed state.
- **Matrix view:** Merged sources excluded from dot rendering
- **Grouped view:** Merged sources excluded from all three columns
- **Discuss view:** Merged sources excluded from pending tray and sidebar

The **engineer board** does NOT filter merged sources — a source may still appear if the original author views their own board.

The **REST export** does NOT filter merged sources — sources appear in their automatability section if classified.

### Permanence

Merge is permanent. There is no unmerge command. The `isMergedSource` flag is permanent for the lifetime of the session.

### Prerequisites

A merge requires:
1. At least 2 source activity IDs
2. A valid facilitator token
3. All source IDs must exist in the session

### Classification Reset

The merged result's `teamAuto` is always reset to `unclassified` regardless of source classifications. This is intentional — the merged activity is a new consolidated framing that may warrant a different verdict.

### Permissions

Merge is initiated by the facilitator only. Engineers have no merge capability. Merge is permanent — there is no undo.

---

## UI Guidance

### Merge Button Trigger

A "⇄ merge" facilitator action button appears on activity cards in: live view, matrix view, grouped view, and discuss view. It sits between the edit and remove buttons. Clicking it opens the merge modal with that activity pre-selected as the source card.

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

**Two-column body layout** — equal width columns:

| Column | Content |
|---|---|
| Left | Candidate checklist — source card + searchable candidate list |
| Right | Editable merged card preview |

**Left Column — Candidate Checklist:**

Eyebrow: "Select cards to merge · {N} selected" — N updates as checkboxes are toggled.

Source card (always selected, cannot be deselected):
- Pre-checked, filled dark checkbox
- Avatar (colored circle with initials), title, metadata line ("{first name} · {TPO_SHORT} · {FREQ_SHORT}" in monospace)
- "starting card" ghost chip at right

Search input: auto-focused, "⌕" icon prefix, "×" clear button, placeholder: `"Search other activities…"`. Filters by title text OR participant name (case-insensitive).

Candidate cards (all non-`isMergedSource` activities except the source, sorted by similarity descending):
- Checkbox, avatar, title, metadata line
- Similarity badge shown only when `similarity > 0.15`; displays percentage (e.g., "34%")
- Empty state: "No activities match '{search}'." in italic muted text

**Right Column — Editable Merged Card:**

Eyebrow: "Merged card — edit before creating"

Stacked avatars row (each offset 8px left, 2px white border between them) + author line: "{first name} + {first name} + …". Chip at right: "⇄ {N} cards · ~{total h/wk:.1f} h/wk" in sage style.

Editable fields (pre-filled from the source activity):
- Title: text input, 14px bold
- Time per occurrence: 4-button grid (`<30m`, `30m-2h`, `half-day`, `day+`)
- Frequency: 5-button grid (`daily`, `weekly`, `monthly`, `quarterly`, `adhoc`)
- Energy: 4-button grid in 3-column layout (`energizing`, `fine`, `tedious`, `draining`)

Footer note: "↳ Original cards are kept and linked to this merged card so you can trace back to what was submitted."

**Modal Footer:**

| Element | Description |
|---|---|
| Status text | "Creating 1 merged card from {N} originals." when 2+ selected; "Select at least one more card to merge." when fewer than 2 |
| Cancel button | Ghost button "Cancel" |
| Merge button | "⇄ Create merged card →" in rust style; disabled when `selected.size < 2` |

**Merge Execution:**

1. Validates `selected.size >= 2`
2. Emits socket event to server with `{ sessionId, sourceIds, title, tpo, freq, energy, token }`
3. Closes modal
4. On receiving merged event from server: removes source activities from display, replaces with server-returned updated versions, adds the new merged activity

### Similarity Badge Colors

| Score | Badge style | Meaning |
|---|---|---|
| > 0.60 | rust accent | High confidence match |
| > 0.30 (up to 0.60) | amber accent | Moderate confidence match |
| ≤ 0.30 | neutral chip | Low confidence match |

Badge only shown at all when `combinedScore > 0.15`.

### Merged Card Avatar Stack

Avatars stacked horizontally, each offset 8px left of the previous, with a 2px white border between them. Used on the merged result card in live view to show all reporters at a glance.

---

## Data Layer

### Merge Tracking Fields on the Merged Result Activity

These fields are present only on activities that are the result of a merge. They are absent on ordinary activities.

| Field | Type | Description |
|---|---|---|
| `mergedFromIds` | `string[]` | IDs of all source activities merged into this result |
| `mergedFromNames` | `string[]` | Display names of the authors of each source, in the same order as `mergedFromIds` |
| `mergedFromInitials` | `string[]` | Initials of the authors of each source |
| `mergedFromColors` | `string[]` | Hex colors of the authors of each source |
| `reportedBy` | `string[]` | Display names of all reporters across all sources (used for multi-author display chip) |
| `reportedByInitials` | `string[]` | Initials for all reporters in the same order as `reportedBy` |
| `reportedByColors` | `string[]` | Hex colors for all reporters in the same order as `reportedBy` |

### Merge Tracking Fields on Source Activities

These fields are set on source activities when they are consumed by a merge.

| Field | Type | Description |
|---|---|---|
| `isMergedSource` | `boolean` | Set to `true` at merge time. Used to suppress source activities from facilitator list views. |
| `mergedIntoId` | `string` | The ID of the merged result activity that consumed this source. |

### ID Format

- **Engineer-submitted activities:** full version-4 UUID
- **Merged result activities:** 8-character truncated UUID (first 8 characters of a random version-4 UUID)

### teamAuto on Merged Result

The merged result's `teamAuto` is always set to `unclassified`, regardless of what the source activities were classified as.

### editHistory on Merged Result

`editHistory` is initialized as an empty array for merged results — no creation entry is added.
