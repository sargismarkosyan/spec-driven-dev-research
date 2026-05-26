# Merge Feature Spec — No UI Guidance

UI layout, dimensions, styling, and visual design removed. Behavioral requirements extracted from UI files are preserved. Design system section removed entirely.

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

## Behavioral Requirements

_Extracted from UI spec files. Layout and visual details removed; requirements and constraints preserved._

### Trigger

A merge action button is available on activity cards in all facilitator views (live, matrix, grouped, discuss). Clicking it opens the merge modal with that activity pre-selected as the source card.

### Merge Modal — Behavioral Requirements

- The source card (the activity on which merge was triggered) is always pre-selected and **cannot be deselected** by the facilitator.
- The merge button is **disabled until at least 2 activities are selected** (source + at least 1 candidate).
- Status text reflects current selection count: shows confirmation when 2+ selected, shows prompt to select more when fewer than 2.
- Candidates are **all non-`isMergedSource` activities** in the session except the source card, **sorted by similarity score descending**. Computed **client-side when the modal opens — no network call**.
- A similarity score badge is shown on each candidate **only when `combinedScore > 0.15`**. Scores at or below this threshold are not displayed.
- A search input filters the candidate list by title OR participant name (case-insensitive substring match).
- The editable merged card is **pre-filled from the source activity's** title, tpo, freq, and energy values. The facilitator may edit any of these before confirming.
- The total h/wk shown on the merged card preview is the **sum of `calcEffort(tpo, freq).hrs`** for all currently selected activities.
- On confirm: emits `activity:merge` with `{ sessionId, sourceIds, title, tpo, freq, energy, token }`, then closes the modal.
- On receiving `activity:merged`: **removes all source activities from the display list**, replaces them with the server-returned updated versions, and **adds the new merged activity**. Source activity records are updated in local state (for traceability views).

### View Filtering — Behavioral Requirements

The following rules apply across all facilitator views:

- `isMergedSource: true` activities are **excluded from all facilitator list views, counts, and trays** (live, matrix, grouped, discuss).
- In the **live view**, merged result cards have an expandable section that **reveals the original source cards in a dimmed state** so the facilitator can trace what was merged.
- In the **discuss view**, the similar activities panel on each card includes a merge button that opens the merge modal for the currently reviewed activity.
- The **engineer board does NOT filter** merged sources — a source activity remains visible to the engineer who submitted it.
- The **REST export does NOT filter** merged sources — source activities appear in export output.

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

Returns similar activities sorted by score. Not called by the browser — exists for programmatic access.

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

Display threshold: `combinedScore > 0.15`. Computed client-side.

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
