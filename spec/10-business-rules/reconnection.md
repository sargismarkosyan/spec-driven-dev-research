# Reconnection

Socket.io assigns a new socket ID every time a client reconnects — including on page refresh. Because the application uses socket IDs as participant identifiers and activity ownership keys (`participantId`), a naive reconnection would create a new participant and leave the engineer unable to edit or delete their own previously submitted activities.

The reconnection rules below prevent this by rebinding a returning participant's identity to their new socket ID.

---

## The Problem

When an engineer refreshes the page or their connection drops and reconnects:

1. Their old socket ID is invalid — it no longer exists in Socket.io's registry.
2. Their browser stores their name in `localStorage` but has no reliable way to recover their old socket ID.
3. If the server creates a new participant record (with the new socket ID), the engineer's existing activities still reference the old socket ID as their `participantId`. Ownership checks will fail and the engineer cannot edit or delete their own work.

---

## Solution: Name-Based Rebinding

When a participant sends a `join-session` event with `isFacilitator` not set to true, the server performs a name-based lookup instead of blindly creating a new record:

### Step 1 — Name lookup

The server searches the session's participant list for an existing participant whose `name` field matches the incoming `name` exactly (case-sensitive match).

### Step 2a — Match found (reconnection path)

When a matching participant is found:

- The old socket ID is removed from the `participants` map (`session.participants.delete(oldId)`).
- The participant record's `id` is updated to the new socket ID.
- The participant is re-inserted into the map under the new socket ID.
- The server broadcasts `participant:left` with the OLD socket ID to all other clients in the room, so they remove the stale entry.
- The server then broadcasts `participant:joined` with the updated participant record (new socket ID) to all other clients.
- The server emits `session:state` back to the reconnected socket with the current full session state.

### Step 2b — No match found (new participant or orphan recovery path)

When no matching participant is found in the `participants` map, the participant may have been removed by a prior disconnect event. The server attempts to recover their identity from their activities:

- The server searches all activities in the session for any with `participantName === name`.
- When an orphan activity is found: the existing participant's `color` and `initials` are recovered from that activity's fields, preserving their visual identity even after a full disconnect/reconnect cycle.
- When no orphan activity is found: a new `color` is assigned from the palette and `initials` are computed from the name as normal.
- A new participant record is created with the new socket ID, the recovered or newly assigned `color` and `initials`, and `joinedAt` set to the current time.
- Normal join flow continues.

---

## Activity Re-Targeting

When a participant is rebound (Step 2a above), the server must also update activity ownership:

For every activity in the session whose `participantName` matches the reconnecting engineer's name, the server updates `participantId` to the new socket ID.

> **Note:** The lookup is by `participantName`, NOT by `participantId`. This is intentional — if the participant was already removed from the `participants` map by a prior disconnect event, their old socket ID is no longer available. Matching by name is more robust across the full reconnection lifecycle.

This ensures that all subsequent permission checks succeed for the reconnected engineer's activities. The engineer regains the ability to edit and delete their own activities without any manual intervention.

---

## Facilitator Reconnection

The facilitator reconnects by including their token in the `join-session` event payload (`isFacilitator: true` and a valid `token`).

When the token matches `session.facilitatorToken`:

- The server updates `session.facilitatorId` to the new socket ID.
- Normal facilitator registration continues.

Because all facilitator-gated operations use the token (not the socket ID) for authorization, the facilitator's ability to control the session is restored immediately after reconnection. No activity re-targeting is needed for the facilitator.

---

## What Is NOT Preserved Across Reconnection

**Server restart:** If the Node.js process restarts, all in-memory session data is lost. The facilitator token stored in the browser's `localStorage` will not match any session. Engineers who attempt to rejoin will encounter an error. There is no recovery path after a server restart — the session must be recreated.

This is a documented limitation of the in-memory storage model. See [../11-non-functional/README.md](../11-non-functional/README.md) for the storage model requirements.

---

## Client Responsibilities

The engineer client must:

- Store the participant's `name` in `localStorage` at join time.
- On page load, check `localStorage` for a stored name and, if found, automatically attempt to rejoin using that name (rather than showing the join form again).

The facilitator client must:

- Store the `facilitatorToken` in `localStorage` at session creation time.
- On page load, check `localStorage` for a stored token and session ID and, if found, automatically attempt to rejoin as the facilitator.
