# Activity Endpoints

These endpoints govern the creation, retrieval, modification, and analysis of activities within a session. All are mounted under `/api/sessions/:id/activities` or `/api/sessions/:id/export`.

For the authentication model and error format, see [README.md](./README.md).

> **Error string precision:** All error `message` strings in this file are exact. Implementations must return them character-for-character as written — including spacing, punctuation, and the presence or absence of words like "is" or "are". AI code generation commonly rephrases these; do not deviate.

---

## POST /api/sessions/:id/activities

Submit a new activity to the session. This is the REST equivalent of the `activity:add` socket event, primarily used by non-browser clients.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| participantId | string | Yes | The submitter's socket ID (establishes ownership) |
| title | string | Yes | The activity title |
| tpo | string | Yes | Time-per-occurrence bucket |
| freq | string | Yes | Frequency bucket |
| energy | string | Yes | Energy level: `energizing`, `fine`, `tedious`, or `draining` |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 400 | `participantId` or `title` is missing | `{ error: "participantId and title required" }` |
| 400 | `session.status` is not `active` | `{ error: "submissions not open" }` |
| 400 | `participantId` does not match any known participant in this session | `{ error: "participant not found" }` |
| 404 | Session ID not found | `{ error: "not found" }` |

### Server Behavior

When validation passes, the server creates a new activity record with:

- A new UUID as `id`
- `participantId` set to the provided value
- Participant display fields (name, initials, color) resolved from the session's participant record matching that `participantId`
- `teamAuto` set to `unclassified`
- `flagged` set to false
- `discussionNote` set to empty string
- `editHistory` initialized with one entry describing the creation

The server broadcasts `activity:added` with the full activity object to all connected participants in the session room.

### Response — 200 OK

Returns the full created activity object directly (not wrapped in a container).

---

## PUT /api/sessions/:id/activities/:aid

Update one or more fields of an existing activity.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |
| aid | The activity ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| participantId | string | No | Engineer's socket ID (for ownership verification) |
| token | string | No | Facilitator token (grants edit rights over any activity) |
| title | string | No | New title value |
| tpo | string | No | New time-per-occurrence value |
| freq | string | No | New frequency value |
| energy | string | No | New energy value |

### Permission Logic

When `token` is provided and matches `session.facilitatorToken`: the update is allowed for any activity.

When no `token` is provided: the provided `participantId` must match the activity's `participantId`. When neither condition is satisfied, the server returns 403.

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 403 | Neither token nor matching participantId provided | `{ error: "forbidden" }` |
| 404 | Session or activity ID not found | `{ error: "not found" }` |

### Server Behavior

The server updates all provided fields on the activity record. Omitted fields are left unchanged. The server broadcasts `activity:updated` with the full updated activity object to all connected participants in the room.

### Response — 200 OK

Returns the full updated activity object directly.

---

## DELETE /api/sessions/:id/activities/:aid

Remove an activity from the session.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |
| aid | The activity ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| participantId | string | No | Engineer's socket ID (for ownership verification) |
| token | string | No | Facilitator token (grants delete rights over any activity) |

### Permission Logic

Same as PUT: facilitator token or matching `participantId` required.

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 403 | Neither token nor matching participantId provided | `{ error: "forbidden" }` |
| 404 | Session or activity ID not found | `{ error: "not found" }` |

### Server Behavior

The server removes the activity from the session. The server broadcasts `activity:deleted` with `{ id }` to all connected participants in the room.

### Response — 200 OK

Returns `{ ok: true }`.

---

## POST /api/sessions/:id/activities/:aid/classify

Set the team's automatability verdict on an activity. Restricted to the facilitator.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |
| aid | The activity ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| token | string | Yes | Must match `session.facilitatorToken` |
| verdict | string | Yes | One of: `yes`, `maybe`, `no` |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 400 | `verdict` is not one of the accepted values | `{ error: "invalid verdict" }` |
| 403 | Token does not match | `{ error: "forbidden" }` |
| 404 | Session or activity not found | `{ error: "not found" }` |

### Server Behavior

When validated:

- `activity.teamAuto` is set to the verdict
- An entry `{ who: facilitatorName, what: "tagged automatable → {verdict}", at: <timestamp> }` is appended to `activity.editHistory`

The server broadcasts `activity:updated` with the full updated activity to all participants in the room.

### Response — 200 OK

Returns the full updated activity object directly.

---

## POST /api/sessions/:id/activities/:aid/flag

Flag or unflag an activity as a discussion priority. Restricted to the facilitator.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |
| aid | The activity ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| token | string | Yes | Must match `session.facilitatorToken` |
| flagged | boolean | No | True to flag, false to unflag. When omitted, the server toggles the current value (if `flagged` is currently true, it becomes false, and vice versa). |
| note | string | No | Optional discussion note to attach simultaneously |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 403 | Token does not match | `{ error: "forbidden" }` |
| 404 | Session or activity not found | `{ error: "not found" }` |

### Server Behavior

When validated:

- `activity.flagged` is set to the provided boolean
- When `note` is provided, `activity.discussionNote` is set to that value
- An entry `{ who: facilitatorName, what: "flagged" or "unflagged", at: <timestamp> }` is appended to `activity.editHistory`, using the NEW value of `flagged` to determine `what`

The server broadcasts `activity:updated` with the full updated activity to all participants in the room.

### Response — 200 OK

Returns the full updated activity object directly.

---

## POST /api/sessions/:id/activities/:aid/note

Set or replace the discussion note on an activity. Restricted to the facilitator.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |
| aid | The activity ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| token | string | Yes | Must match `session.facilitatorToken` |
| note | string | Yes | The note text to set on the activity |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 403 | Token does not match | `{ error: "forbidden" }` |
| 404 | Session or activity not found | `{ error: "not found" }` |

### Server Behavior

`activity.discussionNote` is set to the provided note string. The server broadcasts `activity:updated` with the full updated activity to all participants in the room.

### Response — 200 OK

Returns the full updated activity object directly.

---

## GET /api/sessions/:id/activities/:aid/merge-candidates

Find activities that are similar to a given activity, suitable for suggesting as merge targets.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |
| aid | The reference activity ID |

### Authentication

None required.

### Similarity Calculation

The server computes a combined similarity score between the reference activity and every other activity in the session:

`combinedScore = 0.85 × titleSimilarity + 0.10 × (sameFreq ? 1 : 0) + 0.05 × (sameTpo ? 1 : 0)`

Title similarity is computed using the Jaccard index over tokenized words. Tokenization rules:

1. Convert the title to lowercase.
2. Strip all non-alphanumeric characters.
3. Split into words.
4. Discard words whose length is 2 characters or fewer.
5. Jaccard index = |intersection of word sets| / |union of word sets|

Only activities with a `combinedScore` of 0.15 or higher are included in the results. Results are sorted by score descending. A maximum of 5 candidates are returned.

For the visual display rules governing similarity score colors (rust/amber/slate thresholds), see [../10-business-rules/merge-rules.md](../10-business-rules/merge-rules.md).

### Response — 200 OK

An array of up to 5 candidate activity objects (the top 5 by similarity score). Only activities with `similarity > 0.15` are included. Each object contains the full activity fields plus:

| Additional field | Description |
|---|---|
| `sem` | Scaled semantic title similarity (Jaccard × 1.3, capped at 1.0) |
| `sameFreq` | Boolean — whether the candidate's `freq` matches the source's `freq` |
| `sameTpo` | Boolean — whether the candidate's `tpo` matches the source's `tpo` |
| `similarity` | Combined similarity score: `0.85 × titleSim + 0.10 × sameFreq + 0.05 × sameTpo` |

> **Note:** This endpoint is not called by the browser client. The client computes candidates locally when opening the merge modal. This endpoint exists for programmatic access.

---

## POST /api/sessions/:id/activities/merge

Merge multiple activities into a single combined record. Restricted to the facilitator.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| token | string | Yes | Must match `session.facilitatorToken` |
| sourceIds | string[] | Yes | Array of at least 2 activity IDs to merge |
| title | string | No | Title for the merged activity; a default is derived if omitted |
| tpo | string | Yes | Time-per-occurrence for the merged result |
| freq | string | Yes | Frequency for the merged result |
| energy | string | Yes | Energy level for the merged result |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 400 | Fewer than 2 source IDs provided (or fewer than 2 exist in the session) | `{ error: "need at least 2 source activities" }` |
| 403 | Token does not match | `{ error: "forbidden" }` |
| 404 | Session or any source activity not found | `{ error: "not found" }` |

### Server Behavior

The server creates a new merged activity record and marks each source activity. For the complete rules governing merged result structure and source activity mutation, see [../10-business-rules/merge-rules.md](../10-business-rules/merge-rules.md).

The server broadcasts `activity:merged` with `{ newActivity, updatedSources }` to all participants in the room.

### Response — 200 OK

| Field | Type | Description |
|---|---|---|
| newActivity | object | The full merged activity object |
| updatedSources | object[] | Array of the source activity records, now marked as merged sources |

---

## POST /api/sessions/:id/activities/relate

Mark two activities as related to each other. Restricted to the facilitator. This is the REST equivalent of the `activity:relate` socket event and is also callable programmatically.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| token | string | Yes | Must match `session.facilitatorToken` |
| activityId | string | Yes | The ID of the first activity |
| relatedId | string | Yes | The ID of the second activity to link to the first |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 400 | `activityId` or `relatedId` is missing | `{ error: "activityId and relatedId are required" }` |
| 403 | Token does not match | `{ error: "forbidden" }` |
| 404 | Session not found | `{ error: "session not found" }` |
| 404 | Either activity ID not found in the session | `{ error: "not found" }` |

### Server Behavior

The server updates both activities' `relatedTo` arrays bidirectionally:

- `activityId` is appended to activity B's `relatedTo` array (if not already present)
- `relatedId` is appended to activity A's `relatedTo` array (if not already present)

Both updates are deduplicated — no ID appears more than once in either array.

The server broadcasts `activity:updated` with the full updated object for each of the two activities separately (two distinct broadcasts).

### Response — 200 OK

| Field | Type | Description |
|---|---|---|
| a | object | The full updated record for the activity identified by `activityId` |
| b | object | The full updated record for the activity identified by `relatedId` |

---

## GET /api/sessions/:id/export

Generate a Markdown export document from the session data.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |

### Authentication

None required. This endpoint is publicly accessible to any caller who knows the session ID.

### Document Structure

The server generates a Markdown document with the following layout:

1. **Title line:** `# Work Audit — {session name}`
2. **Date line:** Current date in "D Month YYYY" format (e.g., "23 May 2026")
3. **Summary line:** `**{N} to automate · {N} to investigate · {N} manual**`
4. **Recoverable estimate:** `Estimated ~{X.X} perceived h/wk recoverable.`
5. **Section: `## 🔧 Automate — act now`** — activities where `teamAuto === 'yes'`
6. **Section: `## 🔍 Investigate — research spike needed`** — activities where `teamAuto === 'maybe'`
7. **Section: `## ✓ Manual — acknowledged, no action this quarter`** — activities where `teamAuto === 'no'`
8. **Footer:** `_Automatability was tagged during the discussion phase — team consensus, not self-report._`

There is no separate "Flagged Priorities" section. Flagged activities appear within their automatability section, sorted first, with a `⭐ **Flagged priority**` bullet appended to their entry.

**Activities in export:** The REST export iterates all activities in the session's activities map. Merged source activities (`isMergedSource: true`) are **not** filtered out in the reference implementation — they appear in their automatability section if classified. Facilitator UI list views exclude merged sources from counts and trays.

**Sort order within each section:** Flagged activities appear before non-flagged; within each sub-group, activities are sorted by perceived cost descending.

**Per-activity format (h3 numbered heading):**

```
### {rank}. {title}
- **Who:** {participantName}
- **Effort:** {tpoLabel} · {freq} · ~{perceivedCost} perceived h/wk
- **Energy:** {energy}
- **Note:** {discussionNote}        ← only if note is non-empty
- ⭐ **Flagged priority**           ← only if flagged
```

**Empty section:** When a section has no activities, it shows `_None_`.

### Response — 200 OK

| Field | Type | Description |
|---|---|---|
| markdown | string | The full Markdown document as a string |
| filename | string | Suggested filename: `{session.id}-audit.md` (derived from the session ID). The facilitator export modal uses a slug of the session name for download instead — see [export-modal.md](../04-facilitator-flow/export-modal.md). |
