# Join Screen

**Route:** `/session/[id]/join`

> **Join URL note:** The link engineers receive points to `/session/{id}` (without a `/join` suffix). The smart router at that path determines whether to show the join form, redirect to the board (if a stored name is found), or redirect to the facilitator view. The join form itself is rendered at `/session/[id]/join` once the router decides the engineer needs to enter a name.

The join screen is the entry point for engineers. It collects a display name and a role, then stores both in localStorage and navigates to the board. No account or email is required.

---

## Layout

The page uses a two-column side-by-side layout:

| Column | Width | Content |
|---|---|---|
| Left | ~50% | Editorial/informational content — brand, session context, trust signals |
| Right | ~50% | The join form |

---

## Left Column

### Brand

- A "W" logomark displayed alongside the "Work Audit" wordmark.

### Invitation Header

- Eyebrow label: "You've been invited"
- Large heading: The session name rendered directly (e.g., if the session is named "Platform team · Q2 audit", the h1 shows exactly that text). While the session is loading, the heading shows "Loading session…".

### Description Paragraph

Below the heading (shown only once session data has loaded), a short paragraph:
> "You'll list the recurring work you actually do and tag each item with three quick questions. Takes about ten minutes."

### Trust Signal Bullets

Three bullet points displayed below the description, each prefixed with a rust-colored "→":

| # | Text |
|---|---|
| 1 | "No account, no email — just your name" |
| 2 | "Your answers stay in this session" |
| 3 | "You can see what your teammates submit" |

### Session Metadata Footer

Displayed at the bottom of the left column in uppercase monospace font (small, muted):

- Format: "↳ SESSION ID · {id}" — for example, "↳ SESSION ID · a3b9c1d2"
- There is no expiry countdown. The session has no expiry field; the footer shows only the raw session ID.

---

## Right Column — Join Form

### Section Header

- Eyebrow label: "Join the session"
- Section heading: "What should we call you?"

### Name Input

| Property | Value |
|---|---|
| Label | "Your name" |
| Type | Text input |
| Placeholder | "Your name" (literal) |
| Auto-focus | Yes — the input receives focus automatically on mount |
| Enter key | Pressing Enter in the name field submits the form (same as clicking Join) |
| Helper text | Displayed below the input in monospace: "↳ shown to teammates, not stored after session ends" |

### Role Selector

- Label: "Role (optional)"
- Five toggle buttons displayed in a row, operating as a single-select group (radio-style)
- Only one role may be selected at a time
- Default selected role: IC

| Button Label | Role Value |
|---|---|
| IC | Individual Contributor |
| EM | Engineering Manager |
| PM | Product Manager |
| UX | UX / Design |
| Other | Other |

- Helper text below the role selector in monospace: "↳ used for filtering · IC is fine for most engineers"

### Duplicate-Name Warning

If the engineer types a name that exactly matches an existing non-facilitator participant's display name, an amber (`--amber-bg`) warning paragraph is shown below the name input before they submit: "Someone is already using this name in the session. If that's you, continue — we'll reconnect you to your existing cards." Submission is still allowed — the reconnection logic handles it.

### Join Button

| Property | Value |
|---|---|
| Label | `Join {session name} →` while idle; `Joining…` while the navigation is in progress |
| Style | Primary action button |
| Disabled when | The name field is empty (whitespace-only counts as empty) |
| Disabled when | A join is currently in progress (`joining` state is true) |

### Status Text (below the Join button)

Two pieces of status information are shown below the join button:

**Status paragraph** (shown only after session data has loaded):

Both the participant count and the lobby message appear in a single paragraph below the join button.

Participant count portion:

| Condition | Text |
|---|---|
| Zero participants | "Be the first to join!" |
| Exactly 1 participant | "1 person is already inside." |
| 2 or more participants | "{n} people are already inside." |

> **Note:** The facilitator is excluded from this count. Only non-facilitator participants are counted and displayed.

Lobby message portion (appended to the participant count text):

| Condition | Appended text |
|---|---|
| Session status is `lobby` | " Submissions open when the facilitator hits start." |
| Session status is anything else | Nothing appended |

---

## Smart Redirect

When the join screen loads, it first checks `localStorage` for a stored name under the key `wa-eng-name-{sessionId}`. If a name is already stored, the page immediately redirects to `/session/{id}/board` without displaying the form. This allows engineers who already joined to return to their board after a page refresh or accidental navigation.

---

## Data Loading

- On page mount, the session is fetched from `GET /api/sessions/{id}`.
- The fetched session provides: the session name, current participant count, and session status.
- While the session is loading, the left column heading shows "Loading session…" and the join button label falls back to "Join session →".
- If the fetch returns an error field, the error state is shown ("Session not found.") and the form is not rendered.
- If the fetch fails (network error), the error message is "Could not load session." and the form is not rendered.

---

## Validation Rules

| Rule | Behavior |
|---|---|
| Name field is empty | The join button is disabled; the form cannot be submitted |
| Join request is in flight | The join button is disabled to prevent double-submission |

---

## Error States

| Error | Display |
|---|---|
| Session not found (404 or invalid ID) | Show an error state message: "Session not found" — the form is not rendered |

---

## Successful Join Behavior

The join screen does **not** make an API call or a socket connection. The "join" action is entirely client-side:

1. The engineer's display name (trimmed of whitespace) is stored in browser localStorage under the key `wa-eng-name-{id}` (where `{id}` is the session ID).
2. The engineer's selected role is stored in browser localStorage under the key `wa-eng-role-{id}`.
3. The page navigates immediately to the board route: `/session/{id}/board`.

The actual socket join (emitting `join-session` and receiving session state) happens on the board page, not on the join screen. The board page reads the name and role from localStorage on mount.

> **Note:** Because the join screen performs no network validation, an engineer can proceed even if the session has ended or does not exist. Error handling for invalid sessions happens on the board page.

---

## Cross-References

- After joining, the engineer is navigated directly to `/session/{id}/board`.
- The board states the engineer may encounter after joining: [board-lobby.md](./board-lobby.md), [board-active.md](./board-active.md), [board-discussion.md](./board-discussion.md).
