# Merge Feature Spec — No Business Rules

Business rules section removed. All other categories present.

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

Pre-checked, filled dark checkbox. Cannot be deselected. Shows avatar, title, metadata line, "starting card" ghost chip.

Eyebrow: "Select cards to merge · {N} selected"

**Left column — Search:**

Auto-focused. Placeholder: `"Search other activities…"`. Filters by title OR participant name.

**Left column — Candidate list:**

Other activities sorted by similarity descending. Computed client-side. Each shows checkbox, avatar, title, metadata, similarity badge (shown when similarity above threshold, displayed as percentage).

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

**Merge execution:**

1. Validates at least 2 selected
2. Emits `activity:merge` with `{ sessionId, sourceIds, title, tpo, freq, energy, token }`
3. Closes the modal
4. On `activity:merged`: removes source activities from display, adds new merged activity, updates sources in local state

### View Filtering

Facilitator views filter out merged source activities:

- **Live view:** Stream and counts exclude merged sources. Merged result cards show expandable section with dimmed source cards.
- **Matrix view:** Merged sources excluded from dots
- **Grouped view:** Merged sources excluded from all columns
- **Discuss view:** Merged sources excluded from tray and counts. Similar activities panel shows "⇄ merge" button.

**Exceptions:**
- Engineer board: merged sources remain visible
- REST export: merged sources included

---

## Technical Interfaces

### Socket — activity:merge (client → server)

Facilitator only.

| Field | Required |
|---|---|
| sessionId | Yes |
| sourceIds (min 2) | Yes |
| title | No |
| tpo, freq, energy | Yes |
| token | Yes |

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

## Design System

### Similarity Badge Colors

| Score | Badge class |
|---|---|
| > 0.60 | `is-rust` |
| > 0.30 | `is-amber` |
| ≤ 0.30 | No accent |

### Modal

- Width: 900px, max height: 90vh
- Overlay: semi-transparent dark, 2px backdrop blur

### Avatar Stack

Horizontal row, each avatar offset 8px left, 2px white border between.
