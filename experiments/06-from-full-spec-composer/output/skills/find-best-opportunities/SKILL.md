---
name: find-best-opportunities
description: Rank top automation candidates from a Work Audit session by effort and verdict. Use when asked what to tackle first or best automation opportunities.
---

# Find Best Opportunities

**Purpose:** Surface the highest-value automation and improvement candidates from a session. Focuses on high-effort draining activities and team verdicts to rank opportunities.

**When to use:** When the facilitator asks "what should we tackle first?", "what are the best automation candidates?", or "where is the team spending the most energy on draining work?"

This skill is **advisory only**. It must not classify any activity. It must not flag any activity without explicit facilitator confirmation.

---

## Required Steps

### Step 1 — Confirm session exists

Call the `get_session` MCP tool to confirm the session exists and check its current status.

### Step 2 — Fetch draining activities

Call the `list_activities` MCP tool with:
- `sessionId`: the provided session ID
- `filter`: `"draining"`

This returns all activities where `energy === 'draining'`.

### Step 3 — Fetch confirmed automatable activities

Call the `list_activities` MCP tool with:
- `sessionId`: the provided session ID
- `filter`: `"automatable"`

This returns all activities where `teamAuto === 'yes'`.

### Step 4 — Score each activity

For each activity from steps 2 and 3 (combined, deduplicated by ID), compute `effortHrsPerWk` using the standard formula:

> `effortHrsPerWk = TPO_HOURS[tpo] × FREQ_PER_WK[freq]`

Where **TPO_HOURS:** `<30m → 0.5`, `30m-2h → 1.25`, `half-day → 4`, `day+ → 8`; **FREQ_PER_WK:** `daily → 5`, `weekly → 1`, `monthly → 0.23`, `quarterly → 0.077`, `adhoc → 0.3`.

Then compute a priority score:

```
score = effortHrsPerWk × (
  teamAuto === 'yes'          ? 3.0 :
  teamAuto === 'maybe'        ? 1.5 :
  teamAuto === 'no'           ? 0.2 :
  teamAuto === 'unclassified' ? 1.0 : 0
)
```

If the activity's `energy` is `'draining'`: multiply the score by 1.5.

### Step 5 — Rank and select top 5

Sort all scored activities by score descending. Select the top 5.

### Step 6 — Compose the output

For each of the top 5 activities, present:

- **Title:** The activity's title
- **Contributor(s):** Participant name(s) who reported it
- **Effort:** `~Xh/wk` (computed from `effortHrsPerWk`)
- **Energy:** draining / neutral / energizing
- **Team verdict:** automatable / maybe automatable / manual work to remove / not yet classified
- **Rationale:** One sentence explaining why it ranks highly (based on effort and verdict only — do not add editorial opinion beyond what the data supports)

After the ranked list, include a separate section titled **"Needs team discussion"** listing any unclassified activities with `energy === 'draining'` and high effort, without scores.

If discussion hasn't started (`teamAuto === 'unclassified'` for most activities), note that scores are preliminary.

Do not recommend removing energizing work just because it is high effort — surface it and mark it as "strategic — protect, don't remove."

### Step 7 — Offer to flag

End with: "Would you like me to flag any of these as priorities? I'll wait for your confirmation before making any changes."

---

## Confirmation Requirement Before Flagging

When the facilitator confirms they want specific activities flagged:

1. List the specific activities to be flagged.
2. Wait for explicit facilitator confirmation.
3. Only after confirmation: inform the facilitator to flag via the UI, or describe the REST endpoint call needed. (The MCP server is read-only and cannot flag activities directly.)

The AI must never flag activities autonomously.

---

## Constraints

- Must not classify any activity. Classification is a team decision made during the live session.
- Must not flag activities without facilitator confirmation.
- Scoring uses only `effortHrsPerWk`, `teamAuto`, and `energy` — do not introduce additional scoring factors.
- MCP tools do NOT enrich activities with a pre-computed `effortHrsPerWk` field. Always compute effort from `tpo` and `freq`.

---

## Acceptance Criteria

- [ ] Top 5 ranked list includes title, contributor, effort, energy, verdict, and data-grounded rationale for each item.
- [ ] "Needs team discussion" section lists unclassified draining high-effort items without scores.
- [ ] Preliminary-score disclaimer appears when most activities are unclassified.
- [ ] Output ends with a confirmation prompt before any flagging action.
- [ ] No activities are classified or flagged by the skill itself.
