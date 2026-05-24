# Timer Rules

The submission timer tracks how much time remains in the submission window. It is a client-side countdown driven by server-provided timestamps. The server is the source of truth for the window parameters; the client recomputes the remaining time locally on each tick.

---

## Timer Activation

The timer is relevant only when `session.submissionWindowMin` is greater than 0. When `submissionWindowMin` is 0, the session is **untimed** and no timer is shown in the UI.

The timer begins counting down from the moment `session.startedAt` is set (when the facilitator starts the session).

---

## Remaining Time Calculation

The client computes remaining time as follows:

`remainingSeconds = (session.startedAt + session.submissionWindowMin × 60) − currentTime`

Where `currentTime` is the current client clock in seconds (or milliseconds converted to seconds). The result is the number of seconds left in the submission window.

The client updates this calculation every 1 second using a repeating interval. The calculation uses the server-provided `startedAt` timestamp as the fixed reference point — the client clock is used only to compute the elapsed delta.

---

## Timer Display Format

| Property | Value |
|---|---|
| Format | `{m}:{ss}` — minutes (no padding) and zero-padded seconds |
| Font | tabular numerals via IBM Plex Mono |

The tabular numeral requirement is critical: because individual digits have equal advance widths in a monospace font, the timer display does not shift horizontally as digit values change. This prevents layout jitter on each tick.

Examples: "9:59", "10:00", "1:07", "0:45"

---

## Urgency Threshold

When `remainingSeconds` drops below 120 (strictly less than 120 — i.e., ≤ 119 seconds, fewer than 2 minutes), the timer display enters an urgency state:

- The timer container background switches to `--rust-bg`
- The timer text color changes to `--rust`
- The pulsing status dot next to the timer switches from sage to rust

The dot is always visible when the timer is shown — it does not appear only in urgency mode. It simply changes from sage to rust when urgency is reached.

These changes are purely visual and do not affect server state. The urgency state reverts if the facilitator extends the window and remaining time rises above 120 seconds again.

---

## Expired State

When `remainingSeconds` reaches 0 or goes negative, the timer area displays the text "Time up" in place of the countdown.

Submissions do **not** close automatically when the timer expires. The timer is a soft deadline. The facilitator must manually close submissions by sending `session:close` or calling `POST /api/sessions/:id/close`. Until the facilitator acts, engineers can continue submitting activities even after the timer has expired.

---

## Extend Logic — Snap-Forward

Snap-forward is applied in **two places** independently — once on the client for immediate display, and once on the server when it processes the socket event. The REST extend endpoint does NOT implement snap-forward (it simply adds minutes to `submissionWindowMin`).

### Client-side snap-forward (immediate display)

When the facilitator clicks "+2 min" or "+5 min", the client updates its local `windowMinRef` before emitting the socket event, so the timer display refreshes immediately without waiting for the server response.

**Window has NOT expired (`windowMinRef ≤ elapsedMin` is false):**

`windowMinRef.current += addMinutes`

**Window HAS expired (`windowMinRef ≤ elapsedMin` is true):**

`elapsedMinutes = (Date.now() − session.startedAt) / 60000`

`windowMinRef.current = ceil(elapsedMinutes) + addMinutes`

After updating the ref, the client calls `tickRef.current()` to re-render the timer immediately.

### Server-side snap-forward (socket handler)

When the server receives the `session:extend` socket event, it applies the same snap-forward logic to the persistent `session.submissionWindowMin`:

**Window has NOT expired (`submissionWindowMin > elapsedMin`):**

`session.submissionWindowMin += addMinutes`

**Window HAS expired (`submissionWindowMin ≤ elapsedMin`):**

`elapsedMin = (Date.now() − session.startedAt) / 60000`

`session.submissionWindowMin = ceil(elapsedMin) + addMinutes`

The server then broadcasts `session:extended` with the updated `submissionWindowMin` to all participants. This corrected value supersedes the client's local snap-forward estimate once received.

---

## Timer Update Propagation

When the window is extended via any mechanism (socket `session:extend` or REST `POST /api/sessions/:id/extend`), the server broadcasts `session:extended` with the updated `submissionWindowMin` to all participants in the room.

All clients receiving this event update their local `submissionWindowMin` immediately. The timer recalculates on the next 1-second tick using the new value. No page reload or manual refresh is needed.

See [../05-real-time/server-to-client.md](../05-real-time/server-to-client.md) for the `session:extended` event payload and client handling.
