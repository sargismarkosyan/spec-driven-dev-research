# Session Endpoints

These endpoints govern session creation and lifecycle transitions. All are mounted under `/api/sessions`.

For the authentication model and error format, see [README.md](./README.md).

> **Error string precision:** All error `message` strings in this file are exact. Implementations must return them character-for-character as written — including spacing, punctuation, and the presence or absence of words like "is" or "are". AI code generation commonly rephrases these; do not deviate.

---

## POST /api/sessions

Create a new session. This is the entry point for the facilitator to initialize a retro session.

### Request Body

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| name | string | Yes | — | Human-readable session name displayed in the UI |
| facilitatorName | string | No | `"Facilitator"` | The facilitator's display name. The browser client always sends `""` (empty string), overriding this default. |
| submissionWindowMin | integer | No | 10 | Submission window length in minutes. Set to 0 for an untimed session |
| liveTeamFeed | boolean | No | true | Whether engineers can see a live feed of other participants' submitted activities |
| recallPrompts | string[] | No | 9 default prompts | Optional array of prompt strings shown to engineers to aid activity recall. Defaults to the server's built-in DEFAULT_PROMPTS list if not provided. |
| enabledCategories | string[] | No | all 9 category IDs | Array of category ID strings to include in the prompt rail; defaults to all 9 available categories |

### Validation

When `name` is absent or empty, the server returns HTTP 400 with `{ error: "name required" }`.

### Server Behavior

The server creates a new session record in the in-memory store with:

- A generated 8-character session ID
- A UUID `facilitatorToken` (the facilitator's secret)
- `status` set to `lobby`
- Empty participants and activities collections

No socket events are broadcast at creation time — no participants have joined yet.

### Response — 200 OK

| Field | Type | Description |
|---|---|---|
| id | string | The 8-character session ID |
| token | string | The UUID facilitator token (store securely; this is the only time it is returned) |
| url | string | The full URL participants use to join the session |

---

## GET /api/sessions/:id

Retrieve the current state of a session.

### Authentication

None required. Any caller with the session ID can fetch session state.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |

### Response — 200 OK

The full session object with:

- `participants` serialized as an array
- `activities` serialized as an array

### Error Responses

| Status | Condition | Body |
|---|---|---|
| 404 | Session ID not found in the in-memory store | `{ error: "not found" }` |

---

## PATCH /api/sessions/:id/settings

Update session configuration fields while the session is in the `lobby` phase. This endpoint allows the facilitator to adjust settings (submission window length, live feed toggle, category selection, recall prompts) after session creation but before starting the session.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |

### Request Body

All fields are optional. Only the fields present in the request body are updated; omitted fields retain their current values.

| Field | Type | Description |
|---|---|---|
| submissionWindowMin | integer | New submission window length in minutes. Must be a non-negative integer. |
| liveTeamFeed | boolean | Whether engineers can see a live feed of other participants' submitted activities. |
| enabledCategories | string[] | Array of category ID strings to include in the prompt rail. |
| recallPrompts | string[] | Array of prompt strings shown to engineers to aid activity recall. |

### Authentication

| Header / Body | Value |
|---|---|
| `token` (request body) | Must match `session.facilitatorToken` |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 400 | Session is not in `lobby` status | `{ error: "settings can only be updated in lobby" }` |
| 400 | `submissionWindowMin` is negative or not an integer | `{ error: "invalid submission window" }` |
| 403 | Token does not match `session.facilitatorToken` | `{ error: "forbidden" }` |
| 404 | Session ID not found | `{ error: "session not found" }` |

### Server Behavior

When the token is valid and the session is in `lobby` status:

- The provided fields are applied to the session record (only fields present in the request body are changed).
- The server broadcasts `session:settings` with `{ submissionWindowMin, liveTeamFeed, enabledCategories, recallPrompts }` to all connected participants in the session room.

### Response — 200 OK

Returns the full serialized session object (same shape as `GET /api/sessions/:id`).

---

## POST /api/sessions/:id/start

Transition a session from `lobby` status to `active`, opening the submission window.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 403 | Token does not match `session.facilitatorToken` | `{ error: "forbidden" }` |
| 404 | Session ID not found | `{ error: "session not found" }` |

### Server Behavior

When the token is valid:

- `session.status` is set to `active`
- `session.startedAt` is set to the current server timestamp

The server broadcasts `session:status` with `{ status: 'active', startedAt }` to all connected participants in the session room.

### Response — 200 OK

Returns `{ ok: true }`.

---

## POST /api/sessions/:id/extend

Extend the submission window by adding minutes to the remaining time.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| token | string | Yes | Must match `session.facilitatorToken` |
| addMinutes | integer | No | Minutes to add; defaults to `2` when omitted |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 403 | Token does not match | `{ error: "forbidden" }` |
| 404 | Session ID not found | `{ error: "session not found" }` |

### Server Behavior

This endpoint does **not** implement snap-forward. It simply adds `addMinutes` to `session.submissionWindowMin` unconditionally:

`session.submissionWindowMin += addMinutes`

Snap-forward logic is only applied by the socket `session:extend` handler. See [../10-business-rules/timer-rules.md](../10-business-rules/timer-rules.md) for the distinction.

After updating the window, the server broadcasts `session:extended` with `{ submissionWindowMin }` to all connected participants in the room.

> **Note:** The facilitator browser client uses the socket `session:extend` event, not this REST endpoint, to extend the timer. This REST endpoint exists for programmatic/external access.

### Response — 200 OK

Returns `{ ok: true }`.

---

## POST /api/sessions/:id/close

End submissions and move the session into the discussion phase.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 403 | Token does not match | `{ error: "forbidden" }` |
| 404 | Session ID not found | `{ error: "session not found" }` |

### Server Behavior

When the token is valid:

- `session.status` is set to `discussion`
- `session.closedAt` is set to the current server timestamp

The server broadcasts `session:status` with `{ status: 'discussion' }` to all connected participants in the room.

### Response — 200 OK

Returns `{ ok: true }`.

---

## POST /api/sessions/:id/complete

Transition a session from `discussion` status to `done`, marking it fully complete.

### Path Parameters

| Parameter | Description |
|---|---|
| id | The session ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| token | string | Yes | Must match `session.facilitatorToken` |

### Validation and Errors

| Status | Condition | Body |
|---|---|---|
| 403 | Token does not match `session.facilitatorToken` | `{ error: "forbidden" }` |
| 404 | Session ID not found | `{ error: "session not found" }` |

### Server Behavior

When the token is valid:

- `session.status` is set to `done`

The server broadcasts `session:status` with `{ status: 'done' }` to all connected participants in the room.

> **Note:** The `done` status is currently treated identically to `discussion` by all UI components. It is reserved for future archival or reporting workflows. See [../01-overview/session-lifecycle.md](../01-overview/session-lifecycle.md) for the full status model.

### Response — 200 OK

Returns `{ ok: true }`.
