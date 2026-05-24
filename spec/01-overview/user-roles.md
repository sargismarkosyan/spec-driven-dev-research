# User Roles

Work Audit has exactly two roles: **Facilitator** and **Engineer**. Every person connected to a session occupies exactly one of these roles. The roles are not symmetric — they see different UIs, have different permissions, and are identified by different mechanisms.

---

## Facilitator

### Identity and Access

There is exactly one facilitator per session. The facilitator is identified by possession of a secret `facilitatorToken` — a UUID generated at session creation time. This token is embedded in the facilitator's URL as a `?token=` query parameter. Anyone who loads the session URL with the correct token is treated as the facilitator for all purposes.

The facilitator's name is captured at session creation and stored as `facilitatorName` on the session. If the facilitator disconnects and reconnects, their socket ID is updated but their token and name remain unchanged. The facilitator does not need to re-enter their name on reconnection.

Possession of the token is the only credential required. There is no password, no account, and no email verification. The token must be kept private; sharing it with another person grants that person full facilitator privileges.

### Exclusive Permissions

The facilitator has exclusive rights to perform the following operations. Engineers cannot perform any of these actions, regardless of how they are requested.

- Start the submission phase (transition session from `lobby` to `active`)
- Extend the submission window timer
- Close submissions and start the discussion phase (transition session from `active` to `discussion`)
- Classify any activity's team automatability verdict (`teamAuto`)
- Flag any activity as a priority (`flagged`)
- Add or edit a discussion note on any activity (`discussionNote`)
- Merge two or more activities into a single merged result
- Edit the title, tpo, freq, or energy of any engineer's activity (on their behalf)
- Delete any activity in the session
- Export the completed session data

### UI Experience

The facilitator sees a completely different interface from engineers. The facilitator's UI progresses through the following views in order:

1. **Lobby view** — displayed while status is `lobby`. Shows the share link for engineers, the session settings (timer duration, live feed toggle, enabled categories), and a button to start submissions. Shows a live roster of engineers who have joined.

2. **Live view** — displayed while status is `active`. Shows all submitted activities in real time as engineers submit them. Shows the countdown timer (if configured). Provides controls to extend the timer, view individual submissions, and end the submission phase.

3. **Discussion views** — displayed while status is `discussion`. The facilitator can switch between three sub-views:
   - **Matrix view**: A 2×2 scatter plot showing all activities positioned by effort (X axis) and energy (Y axis). See [../02-data-model/calculations.md](../02-data-model/calculations.md) for coordinate formulas.
   - **Grouped view**: Activities grouped by their `teamAuto` classification, sortable by effort.
   - **Discuss view**: A sequential, one-at-a-time view for running the live discussion. Activities are shown one at a time, sorted by perceived cost descending, so the most painful unreviewed work appears first. The facilitator classifies, flags, and adds notes in this view.

4. **Export** — available once status is `discussion` or `done`. Allows the facilitator to download or copy the session results.

---

## Engineer

### Identity and Access

Any number of engineers may join a session. There is no server-enforced participant limit in the current implementation. Engineers are identified solely by their display name. There is no password, account, or email verification for engineers.

When an engineer joins, they type their name on the join screen. This name is saved to the browser's `localStorage` so that if the engineer reloads the page, their name is pre-filled and the system recognizes them as the same person. Name-based identity is the mechanism for reconnection — see [../02-data-model/participant.md](../02-data-model/participant.md) for the reconnection rules.

### Permissions

Engineers can perform the following operations:

- Submit a new activity during the `active` phase
- Edit the title, tpo, freq, or energy of any activity they personally submitted, during the `active` phase
- Delete any activity they personally submitted, during the `active` phase

### Restrictions

Engineers cannot perform the following operations under any circumstances:

- Classify activities (set `teamAuto`)
- Flag activities as priorities
- Add discussion notes
- Merge activities
- Edit or delete another engineer's activity
- Access facilitator-only views or controls
- Export session data **via the in-app UI** (no export button in the engineer interface). Engineers may still call `GET /api/sessions/:id/export` directly or use the MCP tool if they know the session ID — the endpoint requires no authentication.

### UI Experience

Engineers see a simpler, single-screen interface that adapts its behavior to the current session status:

1. **Join screen** — displayed before the engineer has entered their name. The engineer types their display name and selects their role (IC, EM, PM, UX, Other). After submitting, they are placed in the lobby.

2. **Board — Lobby state** — displayed after joining while status is `lobby`. Shows a waiting message and the list of engineers who have joined. No submission controls are visible yet.

3. **Board — Active state** — displayed while status is `active`. The submission form is visible and active. The engineer can submit activities and edit or delete their own previously submitted activities. If `liveTeamFeed` is true on the session, the engineer can see other engineers' submitted activities in real time as they appear; if false, each engineer sees only their own submissions during the active phase.

4. **Board — Discussion state** — displayed while status is `discussion` or `done`. The submission form is hidden. The engineer sees their own submitted activities in read-only cards with live verdict chips. Flagged activities from any submitter appear in a sidebar visible to all engineers. The engineer does not see other engineers' non-flagged activities. The engineer cannot interact with classifications or notes.
