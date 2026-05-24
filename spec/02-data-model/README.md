# Data Model

The Work Audit data model consists of three core entities: **Session**, **Participant**, and **Activity**. All data is held in server memory for the lifetime of the process. There is no persistent storage layer.

---

## Entities

### Session

A session is the top-level container for a single audit event. It holds configuration, lifecycle state, and references to all participants and activities. There is no concept of a "project" or "organization" — each session is standalone and self-contained.

Every session is addressable by its 8-character `id`, which appears in the share URL given to engineers. The facilitator's URL includes an additional `?token=` query parameter containing the `facilitatorToken` secret.

See [session.md](./session.md) for the complete field reference.

### Participant

A participant is any person connected to the session, including the facilitator. Participants are stored as a map keyed by socket ID. Because socket IDs change on reconnection, name-based rebinding is used to preserve participant identity across browser reloads.

Each participant has a display name, a role, a derived color (assigned from a fixed palette by join order), and derived initials (computed from the name). The facilitator is a participant with `isFacilitator` set to true.

See [participant.md](./participant.md) for the complete field reference, color derivation rules, and reconnection behavior.

### Activity

An activity is a single recurring work item submitted by an engineer. It captures the three submission dimensions (tpo, freq, energy), the facilitator's classification (teamAuto, flagged, discussionNote), and metadata for ownership, authorship display, and edit history.

Activities also carry merge tracking fields. When the facilitator merges two or more activities, the merged result carries references to its sources, and each source carries a reference back to the result. This bidirectional tracking allows the UI to display merged provenance correctly.

See [activity.md](./activity.md) for the complete field reference including all merge tracking fields.

---

## Relationships

- A **Session** contains zero or more **Participants** (stored as a map: socket ID → Participant).
- A **Session** contains zero or more **Activities** (stored as a map: activity ID → Activity).
- Each **Activity** references the **Participant** who submitted it via `participantId` (socket ID) and `participantName` (denormalized display name).
- **Activities** may reference other **Activities** through two relationship mechanisms:
  - **Merge tracking**: `mergedFromIds` on a merged result activity lists the IDs of its source activities; `mergedIntoId` on each source points back to the merged result.
  - **Related links**: `relatedTo` on an activity lists the IDs of manually linked peer activities. This relationship is bidirectional — both activities carry each other's ID in their `relatedTo` array.

---

## Enumerations and Calculations

All enumeration values (tpo, freq, energy, teamAuto, role) are defined in [enumerations.md](./enumerations.md).

All derived calculations (effort in hours per week, display formatting, perceived cost, matrix coordinates, quadrant zones) are defined in [calculations.md](./calculations.md).
