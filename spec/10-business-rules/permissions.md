# Permissions

Access control in Work Audit is role-based with two roles: **Facilitator** and **Engineer**. Engineers are further distinguished by activity ownership — an engineer who created an activity has different rights from an engineer who did not.

There is no explicit authentication for engineers. An engineer is identified by their `participantId` (their socket ID at join time), which is stored on every activity they create. The server verifies engineer ownership by comparing the requesting socket's `participantId` against the activity's stored `participantId`.

---

## Access Control Matrix

| Action | Facilitator | Engineer (owner) | Engineer (other) |
|---|---|---|---|
| Create session | Allowed | Not allowed | Not allowed |
| View session state | Allowed | Allowed | Allowed |
| Start submissions | Allowed | Not allowed | Not allowed |
| Extend submission window | Allowed | Not allowed | Not allowed |
| Close submissions | Allowed | Not allowed | Not allowed |
| Add activity | Allowed (via REST) | Allowed (via socket) | Not allowed |
| Edit own activity | Allowed | Allowed | Not allowed |
| Edit another engineer's activity | Allowed | Not allowed | Not allowed |
| Delete own activity | Allowed | Allowed | Not allowed |
| Delete another engineer's activity | Allowed | Not allowed | Not allowed |
| Classify teamAuto verdict | Allowed | Not allowed | Not allowed |
| Flag activity as priority | Allowed | Not allowed | Not allowed |
| Set discussion note | Allowed | Not allowed | Not allowed |
| Merge activities | Allowed | Not allowed | Not allowed |
| Mark activities as related | Allowed | Not allowed | Not allowed |
| Export session | Allowed (facilitator export modal) | Allowed (REST/MCP only — no UI) | Allowed (REST/MCP only — no UI) |

---

## Facilitator Authentication

The facilitator is authenticated by a **facilitator token** — a UUID generated when the session is created via `POST /api/sessions`. The token is:

- Returned once in the session creation response body
- Stored in the facilitator's browser `localStorage`
- Passed in URLs as `?token=` for facilitator-specific links
- Passed in request bodies as `{ token }` for REST calls
- Passed in socket event payloads for all facilitator-gated socket events

The token is **never displayed** in the UI to participants. It is a secret that grants elevated access.

If the facilitator token is lost (e.g., the browser's localStorage is cleared), the facilitator cannot recover their elevated access for that session. There is no token recovery mechanism.

---

## Engineer Authentication (Ownership)

An engineer is considered the owner of any activity whose `participantId` field matches the engineer's current `participantId`. The `participantId` is the engineer's socket ID at the time the activity was submitted.

Ownership persists after disconnection. Because activities store the `participantId` at creation time — not a live reference — an engineer's ownership of their activities survives browser refreshes and reconnects, provided the reconnection rebinding logic updates the stored `participantId` on their activities. See [reconnection.md](./reconnection.md) for the full rebinding flow.

---

## Enforcement Points

Permission checks are enforced at two layers:

**Socket events:** The server checks permissions in the event handler before mutating any state or broadcasting any event. Rejected events result in an `error` event sent back to the requesting socket only.

**REST endpoints:** The server checks permissions before processing the request. Rejected requests receive HTTP 403 Forbidden with `{ error: "forbidden" }`.

Both layers enforce the same rules — there is no way to bypass socket-level permissions by going through REST, or vice versa.

---

## Export Access

The export endpoint (`GET /api/sessions/:id/export`) and the MCP export tool require no authentication. Anyone who knows the session ID can generate and download the export. This is a deliberate design choice: the session ID is considered sufficient access control for read-only exports.

The facilitator token is not required to view or export session data.

**UI vs API:** Only the facilitator has an in-app export experience (the export modal in the facilitator topbar). Engineers do not have an export page or export button; they may still retrieve the Markdown via the REST endpoint or MCP if they know the session ID.
