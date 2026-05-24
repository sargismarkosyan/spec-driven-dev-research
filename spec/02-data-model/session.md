# Session Entity

A session is the top-level container for a single Work Audit event. It is created by the facilitator and holds all configuration, lifecycle state, participant records, and activity records for that event.

---

## Field Reference

| Field | Type | Default | Required | Description |
|---|---|---|---|---|
| `id` | String (8 characters) | Generated at creation | Yes | Unique session identifier. Appears in all share URLs. Generated as a short random alphanumeric string at creation time. Immutable after creation. |
| `name` | String | None | Yes | Human-readable name for the session. Example: "Platform team · Q2 audit". Must be provided at creation. No length constraint is specified, but implementations should support at minimum 100 characters. |
| `facilitatorId` | String (socket ID) | Set at creation | Yes | The socket connection ID of the facilitator's current connection. Updated each time the facilitator reconnects with a valid token. Used by the server to route facilitator-only events and verify ownership. |
| `facilitatorName` | String | `""` (empty) | Yes | Display name of the facilitator. The create-session form does not expose a facilitator-name input; the POST request sends this field as an empty string. The field is present on the session record but will always be empty in the current implementation. It is referenced in engineer-facing UI text (e.g., "Submissions will begin when {facilitatorName} hits Start") and will appear blank when facilitatorName is empty. |
| `facilitatorToken` | String (UUID) | Generated at creation | Yes | Secret token that authenticates facilitator-only operations. Passed as a `?token=` query parameter in the facilitator's URL. Any request that includes this token and matches this session's value is granted facilitator privileges. Must not be exposed to engineers. Immutable after creation. |
| `status` | Enumeration | `lobby` | Yes | Current lifecycle status of the session. One of: `lobby`, `active`, `discussion`, `done`. Transitions are strictly forward-only. See [../01-overview/session-lifecycle.md](../01-overview/session-lifecycle.md) for full transition rules. |
| `submissionWindowMin` | Integer (≥ 0) | `10` | Yes | Duration of the submission timer in minutes. A value of `0` means the session is untimed — no countdown is shown and the facilitator must manually trigger the end of submissions. A value greater than zero causes a visible countdown to be displayed during the `active` phase, measured from `startedAt`. Must be a non-negative integer. |
| `liveTeamFeed` | Boolean | `true` | Yes | When true, all engineers see each other's submitted activities in real time during the `active` phase. When false, each engineer sees only their own submissions during the active phase; all submissions become visible to everyone once the session moves to `discussion`. The facilitator sees all submissions regardless of this setting. |
| `recallPrompts` | Array of Strings | `[]` | No | Custom prompt strings added by the facilitator at session creation to help engineers recall activities they might otherwise forget. Displayed on the engineer's submission board as reminders. May be empty. |
| `enabledCategories` | Array of category ID strings | All categories enabled | Yes | The subset of prompt category IDs that are shown to engineers on the submission board. The facilitator configures this at session creation. When set to the full list of available categories, behavior is identical to "all enabled." Must contain at least one category ID. |
| `createdAt` | Timestamp (ISO 8601) | Set at creation | Yes | The date and time when the session was created. Set once at creation and never modified. |
| `startedAt` | Timestamp (ISO 8601) | Absent until transition | No | The date and time when the session moved from `lobby` to `active`. Not present on the session record until the facilitator starts submissions. Set once and never modified after that. |
| `closedAt` | Timestamp (ISO 8601) | Absent until transition | No | The date and time when the session moved from `active` to `discussion`. Not present on the session record until the facilitator closes submissions. Set once and never modified after that. |
| `participants` | Map: socket ID → Participant | `{}` | Yes | All current and historical participants in the session, keyed by socket connection ID. See [participant.md](./participant.md) for the Participant field reference. When a participant reconnects, their record is rebounded to the new socket ID under the old key structure — see the reconnection rules in [participant.md](./participant.md). |
| `activities` | Map: activity ID → Activity | `{}` | Yes | All activities submitted in the session, keyed by activity UUID. Includes both active activities and merged-source activities (which carry `isMergedSource: true`). See [activity.md](./activity.md) for the Activity field reference. |

---

## Constraints and Rules

- The `id` must be unique across all sessions in memory. Collision must be retried at generation time.
- The `facilitatorToken` must be a version 4 UUID. It is generated server-side and never derived from user input.
- `status` transitions are enforced server-side. Any attempt to set `status` to a value that is not the next state in sequence must be rejected.
- `submissionWindowMin` must be a non-negative integer. Fractional or negative values are invalid.
- `startedAt` must not be set before `status` transitions to `active`. Similarly, `closedAt` must not be set before `status` transitions to `discussion`.
- `participants` and `activities` are initialized as empty maps and populated over time. They must never be null; an empty map is the correct initial value.
- The `enabledCategories` array may not be empty. If the facilitator deselects all categories, the system must enforce that at least one remains selected. Any `PATCH /api/sessions/:id/settings` request whose `enabledCategories` payload would result in an empty array must be rejected with HTTP **400** and must not modify the session. The server must apply this check before writing the update.

---

## Share URL Formats

The session generates two URLs:

- **Engineer URL**: Contains only the session `id`. Format: `{base_url}/session/{id}`. This is the URL shared with engineers.
- **Facilitator URL**: Contains the session `id` and the `facilitatorToken`. Format: `{base_url}/session/{id}?token={facilitatorToken}`. This URL must be kept private. Anyone who loads it is treated as the facilitator.
