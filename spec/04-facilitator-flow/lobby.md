# Facilitator Lobby

**Route:** `/session/[id]/lobby`

The facilitator lobby is shown immediately after session creation. The facilitator shares the join link with the team and waits for engineers to join. The facilitator can start the submission phase at any time.

---

## Layout

The page uses a two-column body layout inside the standard `wa-layout` shell (topbar + full-height scrollable body):

| Column | Width | Content |
|---|---|---|
| Left | 1.1fr (slightly wider) | Share link, session ID, start button |
| Right | 1fr | Joined participant list |

---

## Topbar

| Element | Position | Description |
|---|---|---|
| Brand | Left | "W Work Audit" logo / home link |
| Divider | Left | 1px vertical separator |
| Session name | Left-center | Session name at 13px bold |
| Subtitle | Below session name | "FACILITATOR · LOBBY · WAITING" in uppercase monospace eyebrow style |
| Status dot | Right | Pulsing dot — sage/green when at least one **engineer** has joined, muted when empty. The facilitator's own connection is not counted. |
| Participant count | Right | "{N} JOINED" in monospace — counts joined **engineers only**; the facilitator is not counted. |

---

## Left Column — Share Section

### Section Header

- Eyebrow: "Share with your team"
- Heading: "Send everyone this link." (32px display font)

### Join URL Card

The join URL format is `{base_url}/session/{id}` — **there is no `/join` suffix**. The smart router at `/session/[id]` handles routing: engineers without a saved name land on the join form; returning engineers go straight to their board. Do not use `/session/{id}/join` as the share URL.

| Element | Description |
|---|---|
| Eyebrow label | "Join URL" |
| URL display | The join URL with the protocol prefix stripped (`https://` or `http://` removed), rendered in monospace, truncated with ellipsis if too long |
| "Copy" button | Ghost button; copies the full join URL to the system clipboard. After copying, label changes to "✓ Copied" for 2 seconds, then reverts |

### Session ID Section

| Element | Description |
|---|---|
| Eyebrow label | "Or share the session ID" |
| Label | "Session ID" in muted text at 13px |
| ID value | The session UUID in large (20px) rust-colored monospace with letter-spacing 0.06em |
| Helper text | "Engineers can also enter this at the join page." |

### Session Settings Panel

Between the session ID section and the start button, the facilitator can modify the session configuration live while waiting in the lobby. Changes take effect immediately and are broadcast to all connected participants via the `session:settings` socket event (see [../05-real-time/server-to-client.md](../05-real-time/server-to-client.md)).

The settings panel contains three editable items:

**Submission window duration**

A row of option buttons allows the facilitator to choose the submission window length:

| Option label | Value |
|---|---|
| 5 min | 5 minutes |
| 10 min | 10 minutes (default) |
| 15 min | 15 minutes |
| 20 min | 20 minutes |
| 0 (untimed) | 0 minutes |

When an option is selected, the client immediately calls `PATCH /api/sessions/:id/settings` with `{ token, submissionWindowMin: <value> }`.

**Live team feed toggle**

A toggle (checkbox or switch) labelled "Show live team feed to engineers". Controls whether engineers can see a real-time feed of other participants' submitted activities. Corresponds to the `liveTeamFeed` session field.

When toggled, the client calls `PATCH /api/sessions/:id/settings` with `{ token, liveTeamFeed: <boolean> }`.

**Enabled categories**

Section label: `"PROMPT CATEGORIES"` in monospace, uppercase, muted.

A grid of category chips — one per available category. Each chip shows the category name. The facilitator can click a chip to toggle that category's inclusion in the prompt rail shown to engineers.

When a chip is toggled, the client calls `PATCH /api/sessions/:id/settings` with `{ token, enabledCategories: <updated array> }`.

### Divider

A horizontal rule separating the sharing options from the start action.

### Start Button Row

| Element | Description |
|---|---|
| Primary button | "Start submissions →" in rust style; disabled during the submission in-flight state (shows "Starting…") |
| Explanatory text | "You can also wait — engineers can join any time before you start." |

**On click of "Start submissions →":**

1. Disables the button and sets label to "Starting…".
2. Emits a `session:start` socket event.
3. Also fires a REST `POST /api/sessions/{id}/start` call as a fallback in case the socket event is missed.
4. Navigates to the facilitator main view at `/session/{id}/facilitator?token={token}`.

### Late Joiners Info Note

A sage-tinted callout box always shown at the bottom of the left panel:

> **Late joiners are first-class.** Engineers can join after the round starts and see what's already been logged.

---

## Right Column — Participants

### Joined Section

- Heading: "Joined" (22px display font)
- Sub-label: "{N} in room" in monospace, right-aligned — counts engineers only.

Only non-facilitator participants (engineers) are shown in this list. The facilitator themselves is not counted or displayed anywhere on this page (neither in the topbar count, the "in room" count, nor the participant cards list). Filter by `participant.isFacilitator === false`.

**Empty state:**

When no participants have joined yet:

- A faint hollow circle icon at low opacity
- Text: "Waiting for engineers to join…"

**Participant card list:**

Each joined participant is displayed as a white card:

| Card element | Description |
|---|---|
| Avatar | Colored circle with the participant's initials |
| Name | Participant display name at 13px bold |
| Role | Role label in monospace at 11px muted |
| Join time | Elapsed time since this client first received the `participant:joined` event for this participant; formatted as "+Ns" (seconds) or "+Nm" (minutes). Only shown for participants who joined after this lobby page was loaded — participants present at initial load have no join time displayed |
| Status dot | A green (sage) dot at the right edge of the card |

---

## Real-Time Updates

- When an engineer joins, a `participant:joined` socket event adds their card to the list and records the current time as their join time.
- When an engineer disconnects, a `participant:left` socket event removes their card from the list.
- When `session:status` broadcasts `active`, the facilitator page automatically navigates to the facilitator main view at `/session/{id}/facilitator?token={token}`.
- The participant count in the topbar updates automatically.

---

## Cross-References

- Preceding step (session creation): [create-session.md](./create-session.md)
- On "Start submissions →": navigates to the facilitator main hub. The live view is the default: [live-view.md](./live-view.md)
- Engineers arriving via the join link land on: `../03-engineer-flow/join-screen.md`
