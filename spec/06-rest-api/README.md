# 06 — REST API

The Work Audit server exposes a REST API over HTTP for session management and activity operations. The REST API runs on the same Node.js/Express process as the Socket.io server and Next.js frontend — there is no separate API server.

All REST endpoints are mounted under the `/api` prefix. Requests and responses use JSON bodies. When REST endpoints mutate state, they broadcast the corresponding Socket.io event to all participants in the affected session room, keeping real-time clients in sync.

## Authentication Model

**Facilitator authentication:** Pass the `facilitatorToken` as `{ token }` in the request body, or as `?token=` in the query string. The server compares this against `session.facilitatorToken` (a UUID generated at session creation and never displayed in the UI).

**Engineer authentication:** Engineers pass their `participantId` (their socket ID at the time they joined the session) in the request body. The server checks this value against the `participantId` field stored on the activity to verify ownership.

**Read operations:** No authentication is required. Any caller who knows the session ID can fetch session state and activities.

**Error format:** All errors return a JSON body with the shape `{ error: "description" }` and an appropriate HTTP status code.

## Table of Contents

| File | Contents |
|---|---|
| [session-endpoints.md](./session-endpoints.md) | Endpoints for creating, fetching, and controlling session lifecycle (`/api/sessions`) |
| [activity-endpoints.md](./activity-endpoints.md) | Endpoints for submitting, editing, classifying, flagging, merging, and exporting activities |

## Related Sections

- Real-time events triggered by REST endpoints: see [../05-real-time/server-to-client.md](../05-real-time/server-to-client.md)
- Permission rules that govern which callers can perform which actions: see [../10-business-rules/permissions.md](../10-business-rules/permissions.md)
- Timer extension logic referenced in the extend endpoint: see [../10-business-rules/timer-rules.md](../10-business-rules/timer-rules.md)
- Merge rules referenced in the merge endpoint: see [../10-business-rules/merge-rules.md](../10-business-rules/merge-rules.md)
