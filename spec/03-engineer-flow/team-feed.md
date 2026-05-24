# Team Feed

The team feed is a section in the right sidebar of the active board state. It shows a live stream of activity submissions from other engineers in the session, helping participants recall work they may have forgotten.

**Visibility:** The team feed is shown only when the session's `liveTeamFeed` setting is `true`. When `liveTeamFeed` is `false`, the entire team feed section is omitted from the sidebar and engineers cannot see each other's activities.

> **Implementation note (experiment 05):** The `liveTeamFeed` flag is stored on the session at creation time, but the engineer board currently renders the team feed regardless of this setting. Treat the behavior above as the target spec; the reference implementation has not yet gated the feed on the flag.

---

## Feed Header

| Element | Style | Content |
|---|---|---|
| Eyebrow label | Monospace | "↳ Team is submitting" |
| Pulsing dot | Animated | A green/sage animated dot displayed next to the header label, indicating live activity |

---

## Empty State

When no teammates have submitted any activities yet:

- Display the message: "Activities from teammates will appear here as they submit."
- No activity items are rendered.

---

## Feed Content

When one or more teammates have submitted activities, the feed displays the most recent submissions.

### Feed Rules

| Rule | Value |
|---|---|
| Maximum items shown | 8 activities |
| Sort order | Newest first (most recent at the top) |
| Source | Activities submitted by other engineers — the current user's own activities are excluded |

### Feed Item Structure

Each item in the team feed displays:

| Element | Description |
|---|---|
| Avatar | A colored circle containing the submitter's initials |
| Submitter name | The first word (first name) of the engineer's display name — not the full name |
| Activity title | The title of the submitted activity |
| Effort pill | Computed effort label (e.g., "~2 h/wk") with color based on effort level per design system rules |
| Energy chip | The energy value of the activity (e.g., "Drains") |
| Timestamp | "just now" — displayed for every feed item; there is no relative-time aging. All items in the feed show "just now" regardless of when they were submitted. |

### Real-Time Behavior

- The feed updates in real time via socket events as teammates submit new activities.
- When a teammate edits an existing activity, the corresponding feed item updates to reflect the new values.
- New items animate in at the top of the feed; older items shift down and eventually scroll out once the 8-item limit is reached.

---

## liveTeamFeed = false Behavior

When the session's `liveTeamFeed` setting is `false`:

- The team feed section is not rendered at all.
- No heading, pulsing dot, or feed items are shown.
- Engineers cannot observe each other's submissions during the active phase.

---

## Cross-References

- The team feed is embedded in the right sidebar of the active board: [board-active.md](./board-active.md)
- The `liveTeamFeed` setting is configured by the facilitator at session creation: `../04-facilitator-flow/create-session.md`
- Suggestions derive their source data from the same team submissions: [suggestions.md](./suggestions.md)
- Effort pill color rules: `../02-data-model/enumerations.md`
