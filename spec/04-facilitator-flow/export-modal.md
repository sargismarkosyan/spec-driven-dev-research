# Export Modal

**Trigger:** Clicking the "Export ↗" ghost button in the facilitator topbar.

The export modal allows the facilitator to preview the session's Markdown output and either copy it to the clipboard or download it as a file.

---

## Presentation

| Property | Value |
|---|---|
| Type | Modal dialog overlaid on the current view |
| Width | 860px |
| Maximum height | 88% of viewport height |
| Background overlay | Semi-transparent dark overlay with 2px backdrop blur |
| Close button | "×" in the top-right corner; closes the modal |

---

## Modal Header

| Element | Description |
|---|---|
| Eyebrow | "Export · session output" |
| Heading | "Take the priorities with you" (22px display font) |
| Close button | "×" top-right |

---

## Two-Column Body

The modal body uses a two-column layout:

| Column | Width | Content |
|---|---|---|
| Left (preview area) | Flexible (1fr) | Markdown preview |
| Right sidebar | 240px | Options, filename, action buttons |

---

## Left Column — Markdown Preview

| Property | Value |
|---|---|
| Font | Monospace (`wa-mono`) at 12px, line-height 1.65 |
| Background | White |
| Overflow | Vertically scrollable |

The content is the Markdown string fetched from `GET /api/sessions/{id}/export` when the modal opens. The preview is read-only and always shows the full export content — there are no include/exclude checkboxes that modify the preview content.

---

## Right Sidebar

The sidebar has a paper background and uses a flex column layout with gap 14px.

### Includes (Informational)

A static labeled list of what the export always includes. All items are pre-checked and non-interactive:

| Item |
|---|
| Flagged priorities |
| All activities |
| Discussion notes |
| Team verdict (auto) |
| Effort per item (~h/wk) |
| Author attribution |

### Team Verdict Callout

A dashed-border callout box:

| Element | Description |
|---|---|
| Eyebrow | "↳ TEAM VERDICT" in monospace |
| Body text | "Automatability was tagged during the discussion phase — team consensus, not self-report." |

### Divider

A horizontal rule.

### Filename Input

| Property | Value |
|---|---|
| Label | "Filename" (eyebrow style) |
| Type | Read-only text input |
| Value | Generated from session name: `{session.name.toLowerCase().replace(/[^\w]+/g, '-')}-audit.md` |

Example: a session named "Platform team · Q2 audit" becomes "platform-team--q2-audit.md".

---

## Action Buttons

Pinned to the bottom of the right sidebar:

| Button | Style | Action |
|---|---|---|
| "Copy to clipboard" | Primary, full width | Copies the Markdown string to the system clipboard; label changes to "✓ Copied!" for 2 seconds, then reverts |
| "Download .md" | Ghost, full width | Downloads the Markdown content as a `.md` file using the generated filename via a programmatically clicked `<a>` element with an object URL |

### MCP Note

Below the action buttons, always shown:

> "↳ MCP connector available · use get_session or export_session_markdown"

in small monospace muted-2 text, center-aligned. This note is always visible regardless of MCP connection state.

---

## Cross-References

- The export modal is opened from the facilitator topbar, specified in: [live-view.md](./live-view.md)
- REST export endpoint: `../06-rest-api/activity-endpoints.md`
- MCP export tool: `../07-mcp-server/tools.md`
- Effort calculation rules (for ~h/wk values): `../02-data-model/calculations.md`
