# Server-to-Client Events

These are the Socket.io events that the server emits to connected browser clients. Some events are sent only to the requesting socket (point-to-point); others are broadcast to all participants in the session room simultaneously.

For the events clients send to the server, see [client-to-server.md](./client-to-server.md).

---

## session:state

**Delivery:** Point-to-point — sent only to the socket that just joined. Not broadcast to the room.

**Trigger:** Emitted immediately after a participant successfully joins a session via the `join-session` event.

### Payload

The full session object, with participants serialized as an array and activities serialized as an array.

### Client Behavior

**Engineer client:** Searches the participants array for the entry whose name matches the locally stored name. Stores the matching entry's `id` as the local `participantId`, and stores the matching `color` and `initials` for use in activity submission UI.

**Facilitator client:** Initializes the full session state in the facilitator UI, including the participant roster, all submitted activities, and the current session status.

---

## activity:added

**Delivery:** Broadcast to all participants in the session room.

**Trigger:** Emitted when a new activity is created — either via the `activity:add` socket event or via the `POST /api/sessions/:id/activities` REST endpoint.

### Payload

The full activity object for the newly created activity.

### Client Behavior

The client adds the new activity to the local activities list. Before adding, the client checks whether an activity with the same ID already exists in the local list. When a duplicate is found, the client does not add a second copy (deduplication guard). This guard prevents double-rendering when the submitting engineer's own client receives the broadcast after already showing the activity optimistically.

---

## activity:updated

**Delivery:** Broadcast to all participants in the session room.

**Trigger:** Emitted whenever any field of an activity changes — including title, tpo, freq, energy, teamAuto, flagged, discussionNote, editedBy, relatedTo, or any other field updated by facilitator actions.

### Payload

The full updated activity object.

### Client Behavior

The client locates the activity in the local list by matching the ID field, then replaces the existing record in place with the full updated object. All derived UI state (verdict chips, flag indicators, discussion notes, edit history) re-renders from the new record.

---

## activity:deleted

**Delivery:** Broadcast to all participants in the session room.

**Trigger:** Emitted when an activity is removed — either via the `activity:delete` socket event or via the `DELETE /api/sessions/:id/activities/:aid` REST endpoint.

### Payload

| Field | Type | Description |
|---|---|---|
| id | string | The ID of the deleted activity |

Only the ID is transmitted — not the full activity object.

### Client Behavior

The client removes the activity with the matching ID from the local activities list. When the engineer's board currently has this activity selected (for example, it is open in an edit state), the client clears that selection.

Note: For engineers performing a soft-delete from their own board, the deletion is optimistic and the socket event is only sent after the 5-second undo window elapses without an undo. See [../10-business-rules/soft-delete.md](../10-business-rules/soft-delete.md).

---

## activity:merged

**Delivery:** Broadcast to all participants in the session room.

**Trigger:** Emitted when a merge operation completes — either via the `activity:merge` socket event or via the `POST /api/sessions/:id/activities/merge` REST endpoint.

### Payload

| Field | Type | Description |
|---|---|---|
| newActivity | object | The full merged activity record |
| updatedSources | object[] | Array of the source activity records, now marked with `isMergedSource: true` and `mergedIntoId` |

### Client Behavior

1. Remove all source activities (identified by the IDs in `updatedSources`) from the display list.
2. Add the `newActivity` to the display list.
3. Update the source activity records in the local state to reflect `isMergedSource: true` and `mergedIntoId`, so that expanded traceability views (which show source cards in a dimmed state under the merged result) can render correctly.

---

## participant:joined

**Delivery:** Broadcast to all other participants in the session room (not sent to the newly joined socket itself).

**Trigger:** Emitted at the end of the `join-session` server handling, after the new participant has been registered.

### Payload

The full participant object for the joining participant.

### Client Behavior

The client adds the new participant to its local participants list. Before adding, the client filters out any existing entry with the same ID to prevent duplicates, then appends the new entry. This deduplication handles the case where the event is received multiple times.

---

## participant:left

**Delivery:** Broadcast to all remaining participants in the session room.

**Trigger:** Emitted in two situations:
1. When a participant's socket disconnects (browser closes, network drops, page navigates away) — broadcast to all remaining room members.
2. When a participant reconnects with a new socket ID — the server emits `participant:left` with the OLD socket ID (so other clients remove the stale entry) before emitting `participant:joined` with the new socket ID.

### Payload

| Field | Type | Description |
|---|---|---|
| id | string | The socket ID of the departing participant |

### Client Behavior

The client removes the participant with the matching ID from the local participants list. UI elements that display the active participant roster (e.g. avatar strips in the topbar or sidebar) re-render to reflect the reduced list.

---

## session:status

**Delivery:** Broadcast to all participants in the session room.

**Trigger:** Emitted whenever the session transitions between status values — when the facilitator starts submissions, closes submissions, or marks the session complete.

### Payload

| Field | Type | Description |
|---|---|---|
| status | string | The new session status: `active`, `discussion`, or `done` |
| startedAt | timestamp | Included only when transitioning to `active`; absent for all other transitions |

> **Note:** When the status transitions to `discussion` or `done`, the payload contains only `{ status }`. The `closedAt` timestamp is stored on the session record server-side but is NOT included in the socket broadcast.

### Client Behavior — Engineer

The engineer client updates the local `session.status` value. Status changes trigger state-based render transitions:

- When status changes from `lobby` to `active`: the submission board becomes visible and interactive.
- When status changes from `active` to `discussion`: the board switches to a read-only discussion view. Engineers can no longer add or edit activities.

### Client Behavior — Facilitator

The facilitator client updates the local `session.status` value. When the new status is `discussion`, the facilitator client automatically switches to the Discuss view tab without requiring manual navigation.

---

## session:extended

**Delivery:** Broadcast to all participants in the session room.

**Trigger:** Emitted after the facilitator successfully extends the submission window via `session:extend` or `POST /api/sessions/:id/extend`.

### Payload

| Field | Type | Description |
|---|---|---|
| submissionWindowMin | integer | The updated total submission window, in minutes |

### Client Behavior

The client updates the local `session.submissionWindowMin` value. The countdown timer immediately recalculates the remaining time from this new total, using the formula: `remaining = (startedAt + submissionWindowMin × 60 seconds) − currentTime`. The timer display updates on the next tick.

For the full timer calculation rules and snap-forward behavior, see [../10-business-rules/timer-rules.md](../10-business-rules/timer-rules.md).

---

## session:settings

**Delivery:** Broadcast to all participants in the session room.

**Trigger:** Emitted after the facilitator successfully updates session settings via `PATCH /api/sessions/:id/settings`. Only fires during the `lobby` phase.

### Payload

| Field | Type | Description |
|---|---|---|
| submissionWindowMin | integer | The current submission window length in minutes |
| liveTeamFeed | boolean | Whether engineers can see a live feed of other participants' activities |
| enabledCategories | string[] | The current array of enabled category ID strings |
| recallPrompts | string[] | The current array of recall prompt strings |

### Client Behavior

The client updates its local copy of all four settings fields from the payload. UI that displays the submission window countdown, the live-feed toggle state, or the prompt rail categories reflects the new values immediately. This allows participants already in the lobby to see settings changes made by the facilitator in real time.

---

## error

**Delivery:** Point-to-point — sent only to the requesting socket. Not broadcast to the room.

**Trigger:** Emitted when the server encounters a validation or permission failure for a specific socket event. Examples include: session not found, edit blocked because the requesting socket does not own the activity.

### Payload

A plain string describing the error. Example values:

- `"session not found: {id} (server may have restarted — return to home and create a new session)"`
- `"edit blocked: not your activity (try refreshing)"`
- `"session not found: {id}"` (from activity:update when session not found)

### Client Behavior

The client logs the error to the browser console. Certain error messages may also surface in the UI — for example, a brief toast or inline error indicator — depending on the context in which they occur.

---

## connect_error

**Delivery:** Emitted by the Socket.io client library itself, not by the server application.

**Trigger:** Fires when the Socket.io client fails to establish or re-establish a connection to the server.

### Client Behavior

The client logs the error to the browser console. The application may display a connection failure indicator to the user, but no automatic retry logic beyond Socket.io's built-in reconnection behavior is specified.
