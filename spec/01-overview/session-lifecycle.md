# Session Lifecycle

A session moves through exactly four statuses in a fixed forward-only sequence. Status cannot be reversed or skipped. The current status determines which operations are permitted for each role and which UI each role sees.

---

## Status Transition Diagram

```
  [Created]
      |
      v
   lobby
  (waiting for engineers to join)
      |
      | Facilitator clicks "Start submissions"
      v
   active
  (engineers submit activities; timer counts down if configured)
      |
      | Facilitator clicks "End → start discussion"
      v
  discussion
  (submissions closed; facilitator classifies activities one by one)
      |
      | Facilitator marks session complete
      v
    done
  (session fully complete; reserved for future use)
```

Transitions are strictly one-directional: `lobby` → `active` → `discussion` → `done`. No backward transitions are possible. Once a session reaches `discussion`, submitted activities are locked for engineers.

---

## Status Definitions

### lobby

The session has been created and is waiting for engineers to join. This is the initial status assigned at session creation.

During `lobby`:

- Engineers can join by entering their name and role on the join screen. Each new joiner is added to the session's participant roster and all connected clients are notified in real time.
- No activities can be submitted. The submission form is not shown to engineers.
- The facilitator sees the share link, session settings, and the live roster of joined engineers.
- The facilitator may update session settings (timer duration, live feed toggle, enabled prompt categories) before starting.
- The session timer has not started.

Transition trigger: The facilitator clicks the "Start submissions" button in the lobby view. This sets `status` to `active` and records the current timestamp in `startedAt`.

### active

The submission phase is open. Engineers can submit, edit, and delete their own activities.

During `active`:

- The submission form is visible and functional for all engineers.
- If `submissionWindowMin` is greater than zero, a countdown timer is shown to both facilitators and engineers. The timer counts down from the configured number of minutes, measured from `startedAt`.
- The facilitator may extend the submission window, which increases the remaining countdown time without changing `startedAt` or `submissionWindowMin` directly (the extension is additive to the current remaining time).
- If `liveTeamFeed` is true, all engineers see every activity submitted by any participant in real time. If false, each engineer sees only their own activities during this phase.
- The facilitator sees all submitted activities in real time regardless of the `liveTeamFeed` setting.
- New participants may still join during the `active` phase.

Transition trigger: The facilitator clicks the "End → start discussion" button (or the timer reaches zero and the facilitator confirms). This sets `status` to `discussion` and records the current timestamp in `closedAt`. After this transition, no new activities can be submitted and existing activities cannot be edited or deleted by engineers.

### discussion

The submission phase is closed. The session is now in a read-only state for engineers. The facilitator classifies activities and drives the group discussion.

During `discussion`:

- The submission form is hidden for all engineers.
- Each engineer sees only their own submitted activities in the main area, displayed in read-only cards with live verdict chips. Flagged activities from any submitter are shown in a sidebar visible to all engineers. Engineers do not see other engineers' non-flagged activities.
- The facilitator has access to three discussion views: matrix, grouped, and discuss. See [user-roles.md](./user-roles.md) for descriptions of these views.
- The facilitator can classify each activity's `teamAuto` field, toggle the `flagged` field, and add or edit `discussionNote` on any activity.
- The facilitator can merge related activities into a single merged result. See [../02-data-model/activity.md](../02-data-model/activity.md) for the merge tracking model.
- The facilitator can export session data at any point during this phase.
- Engineers cannot submit, edit, or delete activities.

Transition trigger: The facilitator marks the session as complete. This sets `status` to `done`.

### done

The session is fully complete. This status is reserved for future use. In the current implementation, the `done` status is treated identically to `discussion` by most UI components. The data is preserved in memory for the lifetime of the server process and can be exported or reviewed, but no further modifications are expected.

During `done`:

- All behavior is identical to `discussion` in the current implementation.
- The export function remains available.
- Future versions may use this status to trigger archival, reporting, or integration with external systems.

---

## Timing and the Submission Window

The `submissionWindowMin` field on the session controls the countdown timer. A value of zero means the session is untimed — no countdown is shown, and the facilitator must manually trigger the transition to `discussion`. A nonzero value causes a visible countdown timer to be displayed to both roles, measured in minutes from `startedAt`.

When the timer reaches zero, the system does not automatically close submissions. The facilitator must confirm the transition. This design prevents abrupt cutoffs if the facilitator is mid-conversation.

The facilitator may extend the submission window at any point during the `active` phase. Extensions are additive to the remaining time, not to the total configured window.

---

## Reconnection Behavior

If an engineer's browser disconnects and reconnects (page reload, network drop), the system attempts to rebind the reconnecting participant to their existing record using their display name as the stable identity key. A new socket ID is assigned, but the participant's name, color, initials, role, and submitted activities remain associated with their original record.

If the facilitator disconnects and reconnects, the same rebinding applies using the facilitator token. The `facilitatorId` field on the session is updated to the new socket ID, and all facilitator permissions are restored automatically.

Reconnection does not create a new participant record if a record with the same name already exists in the session.
