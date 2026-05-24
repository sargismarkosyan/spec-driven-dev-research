# MCP Tools

The MCP server exposes four tools. All tools are read-only — they cannot create, update, or delete any data. All tool responses use the standard MCP content format: `{ content: [{ type: "text", text: <string> }] }`.

For the transport and authentication model, see [README.md](./README.md).

---

## list_sessions

**Description:** "List all active Work Audit sessions."

### Input Parameters

None.

### Output

A JSON-formatted string (pretty-printed with 2-space indentation) containing an array of session summary objects. Each summary has:

| Field | Description |
|---|---|
| `id` | The session ID |
| `name` | The session name |
| `status` | Current lifecycle status |
| `participants` | Count of current participants (integer) |
| `activities` | Count of submitted activities (integer) |

> **Note:** `createdAt` and other session metadata fields are not included in this summary. Only the 5 fields above are returned.

### Notes

Because the application uses in-memory storage, this tool returns only sessions that exist within the currently running server process. Sessions from previous server runs are not available.

---

## get_session

**Description:** "Get full state of a Work Audit session, including all activities."

### Input Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | Session ID |

### Output

A JSON-formatted string (pretty-printed) of the full session object, with:

- `participants` serialized as an array of participant records
- `activities` serialized as an array of activity records

Activity records are returned as-is from the in-memory store — no additional computed fields (e.g., `effortHrsPerWk`) are added.

When the session is not found, returns `{ content: [{ type: "text", text: "Session not found." }] }`.

---

## export_session_markdown

**Description:** "Export a Work Audit session as a Markdown priority report."

### Input Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | Session ID |

### Output

A plain Markdown string (NOT JSON). The document uses a simpler format than the REST `/api/sessions/:id/export` endpoint:

**Document structure:**

```
# Work Audit · {session name}
Facilitator: {facilitatorName} · {total activity count} activities · {participant count} participants

## ★ Flagged priorities ({count})
- **{title}** — {participantName} · {tpo} · {freq} · {energy} [★ if flagged]
  _{discussionNote}_    ← only if note is non-empty

## Automatable ({count})
[same bullet format]

## Maybe automatable ({count})
[same bullet format]

## Manual forever ({count})
[same bullet format]

## Unclassified ({count})
[same bullet format]

---
_Automatability classified by team during discussion — not self-report._
```

**Key differences from the REST export endpoint:**

| Aspect | MCP `export_session_markdown` | REST `GET /api/sessions/:id/export` |
|---|---|---|
| Format | Bullet list per activity | Numbered h3 headings per activity |
| Sections | 5 (Flagged, Automatable, Maybe automatable, Manual forever, Unclassified) | 3 (Automate, Investigate, Manual) |
| Flagged section | Separate first section | No separate section; flagged items within each auto-section |
| Merged sources | Included (all activities) | Excluded |
| Sort order | No sort (insertion order) | By perceived cost descending, flagged first within section |
| Effort display | Raw `tpo · freq` values | Computed perceived h/wk |

When the session is not found, returns `{ content: [{ type: "text", text: "Session not found." }] }`.

---

## list_activities

**Description:** "List activities from a session, optionally filtered."

### Input Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| sessionId | string | Yes | The session to query |
| filter | string (enum) | No | One of: `"all"`, `"flagged"`, `"automatable"`, `"draining"`. Defaults to `"all"` when omitted. |

### Filter Values

| Value | Behavior |
|---|---|
| `"all"` | Returns all activities in the session (default) |
| `"flagged"` | Returns only activities where `flagged` is `true` |
| `"automatable"` | Returns only activities where `teamAuto` is `"yes"` |
| `"draining"` | Returns only activities where `energy` is `"draining"` |

### Output

A JSON-formatted string (pretty-printed) containing an array of activity objects matching the filter. Activities are returned as-is from the store — no computed `effortHrsPerWk` enrichment. Merged source activities are included unless the filter excludes them.

When the session is not found, returns `{ content: [{ type: "text", text: "Session not found." }] }`.

---

## Cross-References

- MCP transport configuration: [README.md](./README.md)
- REST export endpoint (different format): `../06-rest-api/activity-endpoints.md`
- AI skills that call these tools: `../08-ai-skills/`
