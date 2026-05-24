# Board — Lobby State

**Route:** `/session/[id]/board`

**Trigger condition:** Session status is `lobby`.

The lobby state is shown to engineers after they have joined but before the facilitator has started the submission phase. Engineers wait here with real-time visibility into who else has joined.

> **Note on routing:** The smart router at `/session/[id]` determines whether to redirect to the facilitator lobby, the engineer board, or the join screen. The board itself lives at `/session/[id]/board`. When the board page loads without a stored name in localStorage, it redirects to `/session/[id]/join`. See [join-screen.md](./join-screen.md) for the smart router logic.

---

## Topbar

The topbar is visible in all board states. In the lobby state it contains:

| Element | Description |
|---|---|
| Left — Brand unit | The `wa-brand` component: the `wa-brandmark` monogram ("W" on dark background) followed by the "Work Audit" wordmark, exactly as defined in [../09-design-system/components.md](../09-design-system/components.md). This is present on every screen. |
| Left — Session name | The session name displayed as a secondary title immediately after the brand unit (same left slot, visually separated) |
| Center — Subtitle | "ENGINEER VIEW · WAITING TO START" in uppercase monospace |
| Right — Timer | Not shown in the lobby state (timer only appears when status is `active` and window > 0) |
| Right — Activity count | Not shown in the lobby state |
| Right — Avatar | The engineer's own avatar (initials + assigned color) shown once the engineer has joined and received a color assignment. Must be visible in the lobby state once the engineer is in the session. |

---

## Lobby Body Content

The lobby body is centered within the main content area.

### Waiting Message

- Decorative element: a faint circle glyph ("◌") at 25% opacity above the heading
- Primary heading: "Waiting for the session to start." (Newsreader display font, ~28px)
- Explanatory text: "The session is open — you're in. Submissions will begin as soon as the facilitator hits 'Start submissions' in the lobby. You'll see the board automatically."

### Participant Cards (Conditional)

> **Note:** The facilitator is excluded from the participant count and from the card list. Only non-facilitator participants (engineers) are counted and displayed.

- When one or more participants have joined:
  - An eyebrow shows: "{N} person in the room" (singular) or "{N} people in the room" (plural)
  - A row of participant cards is displayed below the eyebrow
  - Each card contains: colored avatar (initials), participant name, and a monospace role badge (e.g., "IC", "EM")
- When no participants have joined yet: the participant section is not shown.

### Real-Time Updates

- The participant list updates in real time as engineers join, driven by socket events.
- When the facilitator starts the session, the board transitions automatically from the lobby state to the active state without a page reload.

---

## Cross-References

- Topbar behavior shared across all states is defined in this file under "Topbar."
- The active state (shown after the facilitator starts) is specified in [board-active.md](./board-active.md).
- Join screen (preceding this state) is specified in [join-screen.md](./join-screen.md).
