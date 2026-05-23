# Experiment 02 — PM Requirements
# Paste everything between the triple backticks as your first message in a fresh Claude Code session.

```
You are extending an existing application. The codebase in the current directory is a working starter — a minimal multi-user shared-canvas app built with Next.js (custom server), Express, Socket.io, and an MCP server, all running in one Node.js process on port 3020. See CLAUDE.md for the project layout.

Your task is to evolve this starter into the application described in the spec below.

Rules:
- Do not change the project structure or tech stack. Extend what is there.
- All surfaces live in one Node.js process on one port. Do not split into multiple packages.
- Extend `src/store.ts` with the domain types (replace or augment the existing `User`/`Note` types as appropriate).
- Extend `src/server.ts` with domain REST routes and Socket.io events.
- Extend `src/mcp.ts` with domain MCP tools.
- Add skill directories under `skills/` with `SKILL.md` files (Anthropic Claude Skills format).
- The frontend is client-side React under `app/` (Next.js App Router). No server-side rendering of business logic.

Spec:
---
## Users

- **Engineer** — logs their recurring work activities during a live session; wants to honestly capture what drains them and what costs the most time; does not want overhead; submitting should feel like filling in a sticky note, not writing a report
- **Facilitator** — creates and runs the session; needs to surface what is draining the team and expensive in time so the team can decide what to fix or automate first; owns the session output
- **Team** — engineers and facilitator together; the discussion and classification decisions happen collectively during the session

---

## User Stories

### Session setup

- As a facilitator, I can create a session by entering a session name and clicking Create.
- As a facilitator, when creating a session I can set a soft submission window from preset options: 5 minutes, 10 minutes, 15 minutes, 20 minutes, or untimed. The window is a guide, not a hard cut-off.
- As a facilitator, when creating a session I can configure which recall prompt categories are shown to engineers. Each category appears as a toggleable chip (e.g. "Yesterday & this week", "Weekly meetings", "Monthly rituals", "On-call & incidents", "Quarterly cycles", "Manual chores", "Handoffs & coordination", "Things I wish we automated", "Other recurring work"). All categories are on by default; I can disable ones that aren't relevant to this team.
- As a facilitator, when creating a session I can toggle a live team feed on or off. When on, engineers see each other's submissions in real time. When off, engineers only see their own cards.
- As a facilitator, creating a session immediately produces a shareable join link that I can copy and paste into the meeting chat. I do not have to leave the creation screen to get the link.
- As a facilitator, after creating a session I land in a lobby screen that shows the join URL prominently, a QR code for the URL, and a pre-written Slack message template I can copy with one click.
- As a facilitator, the lobby shows a live list of everyone who has joined, including their name, role, and the time they joined.
- As a facilitator, the lobby shows a dashed "not yet joined" section for participants I was expecting but who haven't arrived yet, with a Nudge button I can use to prompt them.
- As a facilitator, I can see a "Start session" button in the lobby that becomes active once at least one engineer has joined.
- As a facilitator, I can extend the submission window mid-session by a fixed increment (e.g. +2 minutes or +5 minutes) or end it early from the session controls.

### Engineer joining

- As an engineer, I can join a session from the link with just my name — no account, no password.
- As an engineer, I can optionally select my role when joining: IC, EM, PM, UX, or Other. The role field is optional; I can skip it.
- As an engineer, after joining I land directly on my activity board — there is no intermediate confirmation screen.
- As an engineer who joins after the session has started, I immediately see all activities already submitted by others in the team feed. I am not disadvantaged by arriving late.

### Engineer activity submission

- As an engineer, I can add a recurring work activity by clicking an "Add activity" button, which opens an inline form directly on my board without navigating away.
- As an engineer, when adding an activity I enter a free-text title describing what I do.
- As an engineer, when adding an activity I answer exactly three structured questions:
  1. **Time per occurrence** — how long does this take each time? Options: Less than 30 minutes · 30 min – 2 hours · About half a day · A full day or more
  2. **Frequency** — how often does this come up? Options: Daily · Weekly · Monthly · Quarterly · Ad hoc / irregular
  3. **Energy** — how does this work feel? Options: Energizes me · Neutral · Drains me
- As an engineer, the form makes clear that I am not asked about automatability — a note on the form states "Automatable? Not asked here — the team decides together." This removes the pressure to self-assess automation potential.
- As an engineer, I can submit my activity and it immediately appears on my board.
- As an engineer, I can edit any of my own activities while the session is open. Editing opens the same inline form pre-filled with the current values.
- As an engineer, I can delete any of my own activities while the session is open.

### Engineer prompt rail

- As an engineer, my board has a left-side prompt rail showing categories of work to help me remember what I actually do. Each category is a clickable item that expands to show example activities.
- As an engineer, the prompt categories shown to me are configured by the facilitator when the session is created. Categories may include: "Yesterday & this week", "Weekly meetings", "Monthly rituals", "On-call & incidents", "Quarterly cycles", "Manual chores", "Handoffs & coordination", "Things I wish we automated", "Other recurring work".
- As an engineer, tapping a prompt example pre-fills the title field on a new draft activity. I still answer all three questions myself — the prompt only provides a starting title.

### Engineer team feed

- As an engineer, I can see what my teammates are submitting in real time in a right-side team feed panel.
- As an engineer, the team feed shows activities from all other participants as they are submitted. My own activities do not appear in the feed — they appear in my center column.
- As an engineer, tapping any activity card in the team feed pre-fills the title on a new draft activity. I still answer all three questions for myself, because my cadence or experience may differ from my colleague's.
- As an engineer, the team feed is read-only. I cannot edit or delete another person's activity from the feed.

### Facilitator live stream view

- As a facilitator, I have a live stream view showing every activity submitted across the team, updating in real time as engineers submit.
- As a facilitator, the live stream has a left sidebar showing how many activities each participant has submitted, giving me a quick sense of participation balance.
- As a facilitator, the live stream has a right panel showing emerging themes (automatically grouped topics the system detects) and a time-cost distribution chart showing how effort breaks down across tpo buckets.
- As a facilitator, each activity card in the live stream shows: participant name and avatar/initials, activity title, all three tags (tpo, freq, energy), and a computed effort estimate in ~hours per week.
- As a facilitator, I can hover over any activity card in the live stream to reveal facilitator actions: Edit, Merge, and Remove.

### Facilitator priority matrix view

- As a facilitator, I can switch to a priority matrix view that places every activity on a 2×2 scatter plot.
- As a facilitator, the matrix X axis represents weekly effort (~hours per week), increasing left to right. The Y axis represents energy drain, with draining at the top and energizing at the bottom.
- As a facilitator, the four quadrants are labeled: **PRIORITY** (top-right: draining and expensive), **TOLERABLE** (top-left: draining but low-effort), **STRATEGIC** (bottom-right: energizing but expensive), and **HEALTHY** (bottom-left: energizing and low-effort).
- As a facilitator, dot color in the matrix represents the automatability verdict: one color for Yes (automatable), one for Maybe, one for No (manual forever), and dashed outline for unclassified.
- As a facilitator, clicking a dot in the matrix opens a detail panel on the right side showing the full activity card — title, participant, all tags, effort estimate, current classification, and facilitator actions (edit, flag, classify).
- As a facilitator, the matrix has filter chips so I can filter displayed dots by classification status or energy level.
- As a facilitator, a "X of Y classified" badge shows my classification progress without needing to count manually.

### Facilitator grouped view

- As a facilitator, I can switch to a grouped view showing activities organized into three columns: **Automatable** (Yes), **Maybe**, and **Manual Forever** (No). Unclassified activities appear in a separate section before classification begins.
- As a facilitator, within each group activities are sortable by effort (default), energy, or contributor name.
- As a facilitator, the grouped view updates live as activities are classified during discussion.

### Facilitator discussion mode

- As a facilitator, I can enter a discussion phase from the reviewing status. Discussion mode shows activities one at a time in a focus panel for the team to decide together.
- As a facilitator, in discussion mode I see the priority matrix on the left with a "pending" tray of unclassified activities, and a "Now Reviewing" panel on the right showing the current activity in focus.
- As a facilitator, the Now Reviewing panel shows large **Yes / Maybe / No** classify buttons. Clicking one sets the automatability verdict for the current activity and advances to the next.
- As a facilitator, keyboard shortcuts 1 / 2 / 3 map to Yes / Maybe / No so I can classify quickly without reaching for the mouse.
- As a facilitator, I can add a discussion note to any activity while reviewing it — a textarea is shown directly on the discussion panel.
- As a facilitator, I can flag any activity as a priority during discussion using a flag button on the Now Reviewing panel.
- As a facilitator, a side rail in discussion mode shows a growing list of flagged activities in the order I flagged them — my running output list.
- As a facilitator, I can navigate discussion with Prev and Skip controls so I can revisit an activity or come back to it later without losing my place.
- As a facilitator, a progress indicator shows "X remaining" so I know how much of the session is left.

### Facilitator card actions — edit

- As a facilitator, I can open an edit dialog for any activity from any view (live stream, matrix, grouped, discussion).
- As a facilitator, the edit dialog shows a header "Editing on behalf of [engineer's name]" so the attribution is always clear.
- As a facilitator, the edit dialog shows the original activity as a read-only preview bar at the top, so I can compare before and after.
- As a facilitator, I can change the activity title. A note on the title field says "changes visible to author" so I know engineers will see my edits.
- As a facilitator, the edit dialog shows the same three segmented question controls pre-filled with the current values, which I can change.
- As a facilitator, the edit dialog has a teamAuto field with buttons: Automatable / Maybe / Manual Forever. I can set or override the classification from here as well as from discussion mode.
- As a facilitator, I can write a discussion note in a textarea on the edit dialog. This note appears in the export alongside the activity.
- As a facilitator, if the activity is currently flagged, a flag banner appears at the top of the edit dialog with an Unflag button.
- As a facilitator, the edit dialog shows a collapsible edit history section listing every change made to the card — who changed what, from what value to what value, and when.
- As a facilitator, the edit dialog footer has a destructive "Remove activity" action on the left side, and Cancel / Save Changes on the right.

### Facilitator card actions — merge

- As a facilitator, I can open a merge dialog for any activity to consolidate near-duplicate submissions.
- As a facilitator, the merge dialog shows the source activity I selected at the top.
- As a facilitator, I can search and filter candidate activities for merging. The system shows the top ranked candidates automatically sorted by similarity score.
- As a facilitator, each candidate shows a similarity score as a percentage, with a breakdown showing how the score was computed: semantic match (word overlap), cadence match (same frequency), and duration match (same tpo bucket). A collapsible section explains the formula.
- As a facilitator, I can select one candidate to merge with the source activity.
- As a facilitator, a merged result preview is shown — with stacked contributor avatars, combined effort displayed with the math ("0.5h + 1.25h = 1.75h/wk"), and a note showing "Reported by Name + Name".
- As a facilitator, three settings toggles control merge behavior: preserve both authors (on by default), sum the effort (on by default), and use the source card's energy and cadence (on by default).
- As a facilitator, the merge dialog footer has a lighter "Treat as related" action (links the two activities without merging), Cancel, and Merge.
- As a facilitator, after merging, both the source and target cards are replaced by a single merged card on all connected clients.

### Facilitator card actions — remove

- As a facilitator, I can remove any activity card from any view.
- As a facilitator, removing an activity immediately removes it from all connected clients' views without requiring a page refresh.

### Export and output

- As a facilitator, I can open an export modal that shows flagged activities formatted for output.
- As a facilitator, the export modal has three tabs: **Markdown**, **CSV**, and **Send via MCP**.
- As a facilitator, the Markdown tab shows a formatted preview of all flagged activities. A checklist on the side lets me choose what to include: title, contributors, effort estimate, automatability verdict, discussion notes, and edit history.
- As a facilitator, I can set the export filename before downloading.
- As a facilitator, I can copy the Markdown to clipboard with one click, or download it as a `.md` file.
- As a facilitator, the MCP tab shows a note if an MCP connector is detected, with instructions to send the export data directly to my AI assistant.
- As a facilitator, the export includes a callout: "Automatability was classified by the team during discussion — not self-reported by engineers."
- As a facilitator using an AI assistant, I can connect to the session via MCP and query data, get summaries, and request recommendations without leaving my AI tool.
- As a facilitator, I can invoke pre-built AI skills to: summarize the session results, identify the highest-value automation candidates, and draft backlog items from the flagged output.

---

## Acceptance Criteria

### Session creation and lobby

- Creating a session requires only a session name. Window duration (5/10/15/20 min or untimed) and recall prompt configuration are optional — defaults are untimed and all categories on.
- The join link is returned immediately upon session creation, without a separate confirmation step.
- The lobby displays: the join URL, a QR code for the URL, a Slack message template with one-click copy, the list of joined participants (name, role, join time), and a Nudge action for expected-but-not-yet-joined participants.
- The Start session button is disabled until at least one engineer has joined.
- The submission window does not force-close submissions when it expires. It is a soft visual indicator only; the facilitator must explicitly end the window or advance the session status.

### Engineer join and board

- Engineers enter only a name to join; role selection is optional and defaults to IC.
- After joining, the engineer lands on a three-column board immediately.
- Engineers joining mid-session see all previously submitted activities in the team feed — they are not starting from a blank slate.
- The board has three columns: left (prompt rail), center (own activities), right (team feed).
- The prompt rail shows only the categories enabled by the facilitator when the session was created.

### Activity submission form

- Each activity form has exactly three questions: time per occurrence (4 options), frequency (5 options), energy (3 options). No automatability field is shown to engineers.
- The form options for time per occurrence are: "Less than 30 minutes", "30 min – 2 hours", "About half a day", "A full day or more".
- The form options for frequency are: "Daily", "Weekly", "Monthly", "Quarterly", "Ad hoc / irregular".
- The form options for energy are: "Energizes me", "Neutral", "Drains me".
- Submitting an activity posts it to the board immediately and broadcasts it to the team feed of all other participants in real time.
- Engineers can edit or delete their own activities while the session status is open.

### Team feed and prompts

- Tapping a team feed card pre-fills the title field only; the engineer must answer all three questions independently.
- Tapping a prompt rail example pre-fills the title field only; the engineer must answer all three questions independently.
- Team feed cards are read-only for engineers — no edit or delete affordances are shown.

### Facilitator views

- All three facilitator views (live stream, matrix, grouped) share the same session state and switch without any data loss or page reload.
- Live stream: shows activities in submission order with per-participant counts in a sidebar, and emerging themes + time-cost distribution in a right panel. Each card shows name/initials, title, all three tags, effort (~h/wk). Facilitator actions appear on hover.
- Priority matrix: a 2×2 scatter plot. X axis = effort (~h/wk, 0–8+). Y axis = energy drain (energizing at bottom, draining at top). Quadrant labels: PRIORITY (top-right), TOLERABLE (top-left), STRATEGIC (bottom-right), HEALTHY (bottom-left). Dot color encodes automatability verdict. Clicking a dot opens a right-side detail panel. Filter chips and "X of Y classified" badge visible.
- Grouped view: three columns (Yes / Maybe / No); unclassified appears in a fourth section until classification starts. Sortable by effort, energy, or contributor.
- Facilitator card actions (edit / merge / remove) are available from all three views.

### Discussion mode

- Discussion mode is accessible once the session status is "reviewing".
- Activities are presented one at a time in a Now Reviewing panel with Yes / Maybe / No classify buttons.
- Keyboard shortcuts 1 / 2 / 3 correspond to Yes / Maybe / No respectively.
- Classifying an activity broadcasts the verdict to all connected clients instantly.
- A discussion note textarea is present on each activity in discussion mode. Notes are saved with the activity and appear in exports.
- The flag button marks an activity as a priority and adds it to the flagged-so-far rail.
- Prev and Skip navigation allow re-visiting and deferring activities without losing queue state.
- Progress indicator shows "X remaining" at all times in discussion mode.

### Merge behavior

- Merge dialog shows similarity scores for candidate duplicates, with a breakdown by component (semantic match, cadence match, duration match).
- The merged card shows: combined author chips, summed effort (with the addend math shown), and energy/cadence from the source card by default (configurable via toggle).
- After a merge, both source and target cards are removed from all views and replaced by the merged card.
- "Treat as related" links the cards without merging them and is visually distinct from the Merge action.

### Edit history and attribution

- All facilitator edits are attributed in an edit history audit trail on the activity card.
- The edit history shows: who edited (facilitator or participant), when, and what changed (from → to for each field).
- Edit history is collapsible in the edit dialog.

### Export

- Export shows only flagged activities by default.
- Available formats: Markdown, CSV, and MCP send.
- Markdown format includes per-activity: title, contributor(s), effort (~h/wk), automatability verdict, and discussion notes if present.
- Filename is configurable before download.
- The MCP tab detects whether an MCP connector is active and shows appropriate instructions.
- Export includes a disclaimer noting that automatability was classified by the team, not self-reported.

### MCP and skills

- The application exposes an MCP server so an AI assistant can create sessions, join as a participant, add activities, classify activities, flag items, and query session data programmatically.
- Three AI skills ship with the application: session summary, find best automation opportunities, and draft backlog from flagged output.
- AI skills must not classify or flag activities autonomously — they surface candidates and ask the facilitator to confirm.

### Session data and real-time sync

- Session data lives in memory for the duration of the process. No database is required.
- All connected clients receive live updates for: participant joins, activity added/updated/removed, activity classified, activity flagged, session status changed, session window updated, and merge events.
- Late joiners receive full session state on load — they do not need to refresh or wait for new events to see prior submissions.

### Non-functional

- Engineer submission must work on a mobile phone browser — the form and board must be usable on a small screen.
- Sessions support up to 20 concurrent participants.
- No authentication is required for engineers; facilitator access is gated by a token in the URL only.
---
```
