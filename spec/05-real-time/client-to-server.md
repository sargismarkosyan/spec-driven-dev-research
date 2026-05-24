# Client-to-Server Events

These are the Socket.io events that the browser emits to the server. Every event is received within the context of a Socket.io room named after the session ID. Server behavior is described for each event, including validation, state mutations, and any resulting broadcasts.

For the full list of events the server sends back to clients, see [server-to-client.md](./server-to-client.md).

---

## join-session

**Purpose:** Register a participant in a session and receive the full current session state.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The ID of the session to join |
| name | string | Yes | The participant's display name |
| role | string | No | One of: `IC`, `EM`, `PM`, `UX`, `Other` |
| isFacilitator | boolean | No | When true, requests facilitator-level registration |
| token | string | No | Facilitator secret; required when `isFacilitator` is true |

### Server Behavior

When the session does not exist, the server takes no action and may emit an error to the requesting socket.

When `isFacilitator` is true and the provided `token` matches `session.facilitatorToken`: the facilitator is recognized, and `session.facilitatorId` is updated to the current socket's ID. **The facilitator is NOT added to the `session.participants` map.** The facilitator's identity is tracked exclusively via `session.facilitatorId` (socket ID) and `session.facilitatorName` (display name). Any iteration over `session.participants` will only see engineer participants.

When `isFacilitator` is false or not provided, the server follows the reconnection rebinding logic:

1. Search the session's participant list for an existing participant whose `name` matches exactly (case-sensitive).
2. When a match is found (reconnection):
   - The old socket ID is removed from the `participants` map.
   - The participant record's `id` is updated to the new socket ID.
   - The participant is re-keyed in the map under the new socket ID.
   - A `participant:left` event is broadcast with the old socket ID so other clients remove the stale entry.
   - All activities whose `participantName` matches the reconnecting engineer have their `participantId` updated to the new socket ID (so subsequent ownership checks for edits/deletes pass).
3. When no match is found (new participant or late joiner after disconnect):
   - The server checks all existing activities for any with a matching `participantName` — if found, the existing `color` and `initials` are recovered from those orphan activities; otherwise new values are assigned.
   - A new participant record is created with the current socket ID, the provided name and role, the recovered or newly assigned color and initials, and `joinedAt` set to now.

After all registration logic completes:

- The socket is assigned to the session's Socket.io room (named by the session ID).
- The server emits `session:state` back to this socket only (not broadcast to room).
- The server broadcasts `participant:joined` to all other sockets in the room.

---

## activity:add

**Purpose:** Submit a new activity to the session. This event is the primary mechanism for engineers to add work items during the active submission window.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The session this activity belongs to |
| title | string | Yes | The activity's title or description |
| tpo | string | Yes | Time-per-occurrence bucket |
| freq | string | Yes | Frequency bucket |
| energy | string | Yes | Energy level: `energizing`, `fine`, `tedious`, or `draining` |

### Validation

- The session must exist.
- `session.status` must be `active`. When the session is not active, the server silently rejects the event or emits an error back to the requesting socket. The event does not broadcast.
- A current participant record must be known for the requesting socket.

### Server Behavior

When validation passes, the server creates a new activity record with the following fields:

- `id`: a new UUID
- `participantId`: the current socket's ID (the submitter)
- `participantName`, `participantInitials`, `participantColor`: copied from the submitter's participant record
- `teamAuto`: set to `unclassified`
- `flagged`: set to false
- `discussionNote`: set to empty string
- `editHistory`: initialized with one entry: `{ who: participantName, what: "created", at: <timestamp> }`

The activity is added to `session.activities`. The server then broadcasts `activity:added` to all participants in the session room.

---

## activity:update

**Purpose:** Edit one or more fields of an existing activity.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The session containing the activity |
| activityId | string | Yes | The ID of the activity to update |
| title | string | No | New title value |
| tpo | string | No | New time-per-occurrence value |
| freq | string | No | New frequency value |
| energy | string | No | New energy value |
| token | string | No | Facilitator token, granting edit rights over any activity |

### Permission Check

When `token` is provided and matches `session.facilitatorToken`: the edit is allowed for any activity regardless of ownership.

When no `token` is provided: the server compares the requesting socket's current `participantId` against the activity's `participantId`. The edit is allowed only when they match (i.e., the requesting socket belongs to the original submitter).

When neither condition is satisfied, the server emits an error event back to the requesting socket with the message `"edit blocked: not your activity"`. No broadcast is sent.

### Server Behavior on Allowed Edit

The server updates all provided fields on the activity record. Fields omitted from the payload are left unchanged.

When the edit is performed by the facilitator (token matched): the `editedBy` field is set to the facilitator's name, and an entry `{ who: facilitatorName, what: "updated", at: <timestamp> }` is appended to `editHistory`. When performed by the owner engineer, the entry uses the engineer's name in `who`.

The server broadcasts `activity:updated` with the full updated activity to all participants in the room.

---

## activity:delete

**Purpose:** Remove an activity from the session.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The session containing the activity |
| activityId | string | Yes | The ID of the activity to remove |
| token | string | No | Facilitator token, granting delete rights over any activity |

### Permission Check

Same rules as `activity:update`: facilitator token grants deletion of any activity; absence of token requires the requesting socket to match the activity's `participantId`.

### Server Behavior

When permission is confirmed, the server removes the activity from `session.activities`. The server broadcasts `activity:deleted` with the payload `{ id }` — only the deleted activity's ID — to all participants in the room.

---

## session:start

**Purpose:** Transition the session from lobby status to active, opening the submission window. This event is restricted to the facilitator.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The target session |
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation

When the token does not match, the server takes no action (or emits an error to the requesting socket).

### Server Behavior

When the token is valid:

- `session.status` is set to `active`
- `session.startedAt` is set to the current timestamp

The server broadcasts `session:status` with `{ status: 'active', startedAt }` to all participants in the room.

---

## session:extend

**Purpose:** Extend the submission window by adding minutes to the remaining time. This event is restricted to the facilitator.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The target session |
| token | string | Yes | Must match `session.facilitatorToken` |
| addMinutes | integer | Yes | Number of minutes to add to the submission window |

### Validation

When the token does not match, the server takes no action.

### Server Behavior — Snap-Forward Logic

The server first calculates how many minutes have elapsed since `session.startedAt`.

When the current remaining time is greater than zero (`submissionWindowMin > elapsedMin`): adds `addMinutes` directly to `session.submissionWindowMin`.

When the current remaining time is zero or negative (`submissionWindowMin ≤ elapsedMin`): applies snap-forward. Sets `session.submissionWindowMin = ceil(elapsedMinutes) + addMinutes`, so that exactly `addMinutes` of time remains from the current moment.

> **Note:** The facilitator client also applies the same snap-forward logic locally (before emitting this event) so the timer display updates immediately without waiting for the server response. See [../10-business-rules/timer-rules.md](../10-business-rules/timer-rules.md) for full details.

After applying the new window value, the server broadcasts `session:extended` with `{ submissionWindowMin }` to all participants in the room.

For detailed timer rules and the rationale for snap-forward, see [../10-business-rules/timer-rules.md](../10-business-rules/timer-rules.md).

---

## session:close

**Purpose:** End the submission window and move the session into the discussion phase. This event is restricted to the facilitator.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The target session |
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation

When the token does not match, the server takes no action.

### Server Behavior

When the token is valid:

- `session.status` is set to `discussion`
- `session.closedAt` is set to the current timestamp

The server broadcasts `session:status` with `{ status: 'discussion' }` to all participants in the room.

---

## session:complete

**Purpose:** Transition the session from `discussion` status to `done`, marking the session as fully complete. This event is restricted to the facilitator.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The target session |
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation

When the token does not match, the server takes no action.

### Server Behavior

When the token is valid:

- `session.status` is set to `done`

The server broadcasts `session:status` with `{ status: 'done' }` to all participants in the room.

> **Note:** The `done` status is currently treated identically to `discussion` by most UI components. It is included to support future archival or integration workflows. See [../01-overview/session-lifecycle.md](../01-overview/session-lifecycle.md) for the full status model.

---

## activity:classify

**Purpose:** Set the team's automatability verdict on an activity. This event is restricted to the facilitator.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The session containing the activity |
| activityId | string | Yes | The activity to classify |
| verdict | string | Yes | One of: `yes`, `maybe`, `no` |
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation

When the token does not match, the server takes no action.

### Server Behavior

When the token is valid:

- `activity.teamAuto` is set to the provided verdict
- An entry `{ who: facilitatorName, what: "tagged → {verdict}", at: <timestamp> }` is appended to `activity.editHistory`

The server broadcasts `activity:updated` with the full updated activity to all participants in the room.

---

## activity:flag

**Purpose:** Flag or unflag an activity as a discussion priority. This event is restricted to the facilitator.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The session containing the activity |
| activityId | string | Yes | The activity to flag or unflag |
| flagged | boolean | Yes | True to flag, false to unflag |
| note | string | No | An optional discussion note to attach |
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation

When the token does not match, the server takes no action.

### Server Behavior

When the token is valid:

- `activity.flagged` is set to the provided boolean value
- When `note` is provided, `activity.discussionNote` is set to that value
- An entry `{ who: facilitatorName, what: "flagged" or "unflagged", at: <timestamp> }` is appended to `activity.editHistory`

The server broadcasts `activity:updated` with the full updated activity to all participants in the room.

---

## activity:note

**Purpose:** Set or replace the discussion note on an activity. This event is restricted to the facilitator.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The session containing the activity |
| activityId | string | Yes | The activity to annotate |
| note | string | Yes | The note text to set |
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation

When the token does not match, the server takes no action.

### Server Behavior

When the token is valid:

- `activity.discussionNote` is set to the provided note string

The server broadcasts `activity:updated` with the full updated activity to all participants in the room.

---

## activity:merge

**Purpose:** Combine two or more activities into a single merged activity record. This event is restricted to the facilitator.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The session containing the activities |
| sourceIds | string[] | Yes | Array of at least 2 activity IDs to merge |
| title | string | No | Title for the merged result; when omitted a default is derived |
| tpo | string | Yes | Time-per-occurrence for the merged result |
| freq | string | Yes | Frequency for the merged result |
| energy | string | Yes | Energy level for the merged result |
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation

- Token must match `session.facilitatorToken`.
- At least 2 source IDs must be provided. Merging a single activity is not permitted.

### Server Behavior

When validation passes, the server creates a new merged activity record with:

- An 8-character truncated UUID (first 8 characters of a random version-4 UUID) as its `id`
- `participantId` taken from the first source activity
- All participant display fields (`participantName`, `participantInitials`, `participantColor`) taken from the first source activity
- `title`, `tpo`, `freq`, `energy` from the event payload
- `teamAuto` set to `unclassified` (classification must be re-applied to the merged result)
- `flagged` set to false
- `discussionNote` set to empty string
- `editHistory` initialized as an empty array (no creation entry for merged results)
- `mergedFromIds`: array of all source activity IDs
- `mergedFromNames`, `mergedFromInitials`, `mergedFromColors`: aggregated from all source activities
- `reportedBy`, `reportedByInitials`, `reportedByColors`: aggregated from all source activity reporters

For each source activity, the server sets:

- `mergedIntoId` to the new merged activity's ID
- `isMergedSource` to true

The server broadcasts `activity:merged` with `{ newActivity, updatedSources }` to all participants in the room.

For the full rules governing merge behavior, see [../10-business-rules/merge-rules.md](../10-business-rules/merge-rules.md).

---

## activity:relate

**Purpose:** Mark two activities as related without merging them. This event is restricted to the facilitator.

### Payload Fields

| Field | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The session containing the activities |
| idA | string | Yes | First activity ID |
| idB | string | Yes | Second activity ID |
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation

When the token does not match, the server takes no action.

### Server Behavior

When the token is valid, the server establishes a bidirectional relationship:

- The ID of activity B is added to activity A's `relatedTo` array, if not already present.
- The ID of activity A is added to activity B's `relatedTo` array, if not already present.

Both arrays are deduplicated. The server broadcasts `activity:updated` for both activity A and activity B to all participants in the room.

---

## disconnect (automatic)

**Purpose:** Clean up a participant's presence record when their browser closes or loses connection.

This event is emitted automatically by the Socket.io framework — client code does not emit it explicitly.

### Server Behavior

The server removes the participant whose socket ID matches the disconnecting socket from `session.participants`. The server broadcasts `participant:left` with `{ id }` — only the departing participant's ID — to all remaining participants in the room.

Note: The participant's activities are not deleted on disconnect. Activity ownership is preserved so that reconnecting engineers can still edit or delete their own submissions. See [../10-business-rules/reconnection.md](../10-business-rules/reconnection.md) for how socket ID rebinding works on reconnect.
