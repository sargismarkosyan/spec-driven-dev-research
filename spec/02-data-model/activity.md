# Activity Entity

An activity is a single recurring work item submitted by an engineer during the `active` phase of a session. It records what the work is, how demanding it is, how it feels energetically, and — during the discussion phase — how the team has classified it.

Activities also carry fields to support the facilitator's merge operation, which combines two or more related activities from different engineers into a single merged result. Understanding the merge model requires understanding the distinction between a **source activity** and a **merged result activity**.

---

## Core Fields

| Field | Type | Default | Required | Description |
|---|---|---|---|---|
| `id` | String | Generated at creation | Yes | Unique identifier for this activity. Used as the map key in the session's `activities` map. Immutable after creation. **ID format depends on origin:** engineer-submitted activities receive a full version-4 UUID; merged-result activities receive an 8-character truncated UUID (the first 8 characters of a version-4 UUID). See [Merge Operation Model](#merge-operation-model) below. |
| `sessionId` | String (session ID) | Set at creation | Yes | The `id` of the parent session. Used to associate the activity with its session when activities are passed outside the session context (e.g., in export payloads or API responses). |
| `participantId` | String (socket ID) | Set at creation | Yes | The socket connection ID of the engineer who submitted this activity, at the time of submission. Used for ownership checks — an engineer may only edit or delete activities where their current socket ID matches this field. Because socket IDs change on reconnect, the `join-session` reconnection handler re-targets all activities matching the reconnecting engineer's name, updating `participantId` to the new socket ID so subsequent ownership checks continue to pass. |
| `participantName` | String | Set at creation | Yes | The display name of the engineer who submitted this activity, denormalized from the participant record at creation time. Preserved for display purposes if the engineer disconnects. |
| `participantInitials` | String (1–2 characters) | Set at creation | Yes | The initials of the submitting engineer, denormalized from the participant record at creation time. Used in activity cards and author chips. |
| `participantColor` | String (hex color) | Set at creation | Yes | The hex color of the submitting engineer, denormalized from the participant record at creation time. Used to visually identify authorship in activity cards. |
| `title` | String | None | Yes | Free-text description of the recurring activity. Written by the engineer in their own words. No length constraint is enforced, but the UI should accommodate at minimum 200 characters without truncation. |
| `tpo` | Enumeration | None | Yes | Time Per Occurrence. One of: `<30m`, `30m-2h`, `half-day`, `day+`. Describes how long the activity takes each time it occurs. See [enumerations.md](./enumerations.md) for label and numeric values. |
| `freq` | Enumeration | None | Yes | Frequency. One of: `daily`, `weekly`, `monthly`, `quarterly`, `adhoc`. Describes how often the activity occurs. See [enumerations.md](./enumerations.md) for label and numeric values. |
| `energy` | Enumeration | None | Yes | Energy level. One of: `energizing`, `fine`, `tedious`, `draining`. Describes how the activity feels to perform. See [enumerations.md](./enumerations.md) for label and numeric values. |
| `teamAuto` | Enumeration | `unclassified` | Yes | The team's automatability verdict, set by the facilitator during the discussion phase. One of: `yes`, `maybe`, `no`, `unclassified`. Only the facilitator may change this field. See [enumerations.md](./enumerations.md) for full label and tone details. |
| `flagged` | Boolean | `false` | Yes | Whether the facilitator has flagged this activity as a priority for follow-up. Only the facilitator may toggle this field. Displayed prominently in the discuss view and exported results. |
| `discussionNote` | String | `""` | Yes | Free-text note added by the facilitator during the discussion phase. May be empty. The facilitator may add, edit, or clear this note at any time during or after the discussion phase. |
| `createdAt` | Timestamp (ISO 8601) | Set at creation | Yes | The date and time when this activity was submitted. Set once and never modified. |

---

## Attribution and Edit Tracking Fields

| Field | Type | Default | Required | Description |
|---|---|---|---|---|
| `editedBy` | String or absent | Absent | No | The display name of the facilitator if this activity was edited by the facilitator on behalf of the original engineer. Absent if the activity has only been edited by its original author, or if it has never been edited. Set by the server when the facilitator submits an edit to an activity they did not author. |
| `editHistory` | Array of edit log entries | One entry at creation (empty for merged results) | Yes | A chronological log of all mutations to this activity. Each entry is an object with three fields: `who` (display name of the person who acted), `what` (a short action string — e.g., `"created"`, `"updated"`, `"tagged → yes"`, `"flagged"`, `"unflagged"`), and `at` (a timestamp). For engineer-submitted activities, the first entry is added at creation with `what: "created"`. For merged-result activities, `editHistory` starts as an empty array — no creation entry is generated. Subsequent entries are appended on each update, classify, flag/unflag, or note operation. Used for audit trail display in the facilitator's edit modal. |

---

## Merge Tracking Fields

The merge operation combines two or more activities into a single merged result. The original source activities are preserved in the session's `activities` map but are marked as consumed. The merged result is a new activity that carries provenance references to all its sources.

These fields are present only on activities that have participated in a merge operation. They are absent (not just null) on ordinary, non-merged activities.

### Fields Present Only on the Merged Result Activity

| Field | Type | Description |
|---|---|---|
| `mergedFromIds` | Array of Strings (activity IDs) | The IDs of all source activities that were merged into this result. Ordering matches the merge-time selection order. Present only on the merged result. |
| `mergedFromNames` | Array of Strings | The display names of the engineers who authored each source activity, in the same order as `mergedFromIds`. Denormalized at merge time for display after potential disconnection. Present only on the merged result. |
| `mergedFromInitials` | Array of Strings | The initials strings of the authors of each source activity, in the same order as `mergedFromIds`. Present only on the merged result. |
| `mergedFromColors` | Array of Strings (hex colors) | The hex color values of the authors of each source activity, in the same order as `mergedFromIds`. Present only on the merged result. |
| `reportedBy` | Array of Strings | The display names of all people who reported this activity — including both the merged result's own author (if different from the sources) and all source authors. Used for the multi-author display chip in the discussion UI. |
| `reportedByInitials` | Array of Strings | Initials for all reporters in the same order as `reportedBy`. |
| `reportedByColors` | Array of Strings (hex colors) | Hex colors for all reporters in the same order as `reportedBy`. |

### Fields Present Only on Source Activities (Consumed by a Merge)

| Field | Type | Description |
|---|---|---|
| `mergedIntoId` | String (activity ID) | The ID of the merged result activity that consumed this source. Set on a source activity at merge time to indicate it has been incorporated into another activity. Present only on source activities. |
| `isMergedSource` | Boolean | Set to `true` on source activities at merge time. Used by the UI to suppress source activities from most list views (they should not appear as separate items once merged) while still keeping them in the `activities` map for historical reference and provenance display. |

---

## Relationship Fields

| Field | Type | Present by default | Description |
|---|---|---|---|
| `relatedTo` | Array of Strings (activity IDs) | Always present; initialized as `[]` at creation | The IDs of other activities that have been manually marked as related to this one, without merging. The relationship is bidirectional: when the facilitator links activity A to activity B, activity A's `relatedTo` array is updated to include B's ID, and activity B's `relatedTo` array is updated to include A's ID (deduplicating). The `relatedTo` field is initialized as an empty array `[]` when the activity is created, so it is always present even before any relation is established. |

---

## Merge Operation Model

The facilitator may select two or more activities and merge them into a single merged result. The merge operation proceeds as follows:

1. The facilitator selects the source activities to merge and provides a title for the merged result (or accepts a default derived from the most prominent source).
2. The server creates a new Activity record for the merged result. The `tpo`, `freq`, and `energy` values come from the facilitator's editable fields in the merge modal (defaulting to the primary source activity's values if not overridden). `teamAuto` is always reset to `unclassified` — it is not copied from any source; the merged result must be re-classified during discussion.
3. The merged result receives an 8-character truncated UUID as its `id` (the first 8 characters of a random UUID).
4. The merged result's `mergedFromIds`, `mergedFromNames`, `mergedFromInitials`, `mergedFromColors`, `reportedBy`, `reportedByInitials`, and `reportedByColors` fields are populated from the source activities.
5. Each source activity has `mergedIntoId` set to the merged result's ID and `isMergedSource` set to `true`.
6. Source activities remain in the `activities` map and are not deleted. They are hidden from standard list views by the `isMergedSource` flag.
7. The merged result is added to the `activities` map and is treated as a regular activity for all subsequent classification and discussion operations.

A merge cannot be reversed once performed. The source activities' `isMergedSource` flag is permanent for the lifetime of the session.

---

## Ownership and Edit Permission Rules

- An engineer may edit or delete an activity if their current socket ID matches the activity's `participantId`. Ownership is preserved across reconnections because the `join-session` reconnect handler re-binds all matching activities to the new socket ID (see [../05-real-time/client-to-server.md](../05-real-time/client-to-server.md)).
- The facilitator may edit, delete, flag, classify, or add notes to any activity in the session, regardless of who submitted it.
- When the facilitator edits an activity they did not submit, the `editedBy` field is set to the facilitator's name and an entry is appended to `editHistory`.
- When an engineer edits their own activity, `editedBy` remains absent (or unchanged if it was previously set by the facilitator) and an entry is appended to `editHistory` with the engineer's name.
- Editing and deleting activities is only permitted during the `active` phase for engineers. The facilitator may edit activities during any phase.
