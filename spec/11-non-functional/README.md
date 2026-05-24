# 11 — Non-Functional Requirements

This document specifies the operational constraints, capacity limits, storage model, deployment architecture, access control model, and data lifecycle rules for the Work Audit application. These requirements apply across all subsystems.

---

## Concurrency

**Requirement:** The application must support up to 20 concurrent engineer participants per session.

This limit applies to the number of active, connected participants in a single session simultaneously. The application is not designed for large-group facilitation. Sessions with more than 20 participants are outside the tested and supported operating range.

There is no enforced participant cap implemented in the server — the limit is a design constraint on the tested operating range, not a hard rejection threshold.

---

## Mobile Support

**Requirement:** The engineer submission flow must function correctly on a mobile phone browser. This is an explicit design requirement, not a best-effort concern.

The two screens that must work on mobile are:

1. The **join screen** — where engineers enter their name and role to join a session.
2. The **engineer submission board** — where engineers add and manage their activities during the active phase.

The facilitator view is not required to support mobile browsers. It is designed for use on a desktop or laptop screen, where the multi-column layout and matrix visualization can render at full size.

All interactive elements on the mobile-supported screens must be touch-friendly: tap targets must be large enough for finger input, and the layout must not require horizontal scrolling on a standard phone viewport.

---

## Storage Model

**Requirement:** The application uses an in-memory data store only. No database, no file system writes, and no external cache are used.

All session data — sessions, participants, activities, tokens — lives exclusively in the memory of the running Node.js process. When the process stops or restarts, all data is permanently lost.

**Implications:**

- There is no data persistence across server restarts.
- There is no backup or recovery mechanism.
- Sessions cannot be resumed after a server outage.
- The application does not write any files to disk during normal operation.

This is an intentional architectural choice for simplicity. Work Audit is designed for synchronous real-time sessions, not for long-lived data management.

---

## Single-Process Architecture

**Requirement:** The entire application runs as a single Node.js process on a single port, configurable via the `PORT` environment variable.

Each experiment in this research series uses a distinct port to allow multiple experiments to run side-by-side without collision. The port follows the convention `30{experiment-number}0` — so experiment 05 uses **3050**, experiment 06 uses **3060**, experiment 07 uses **3070**, and so on. The CLAUDE.md starter for each experiment must set the correct port for that experiment number, and the server must default to that port when `PORT` is not set.

The following subsystems all run within that single process:

| Subsystem | Technology |
|---|---|
| Frontend (SSR) | Next.js |
| REST API | Express |
| Real-time | Socket.io (attached to the same HTTP server) |
| MCP server | `@modelcontextprotocol/sdk` Streamable HTTP transport (mounted at `/mcp`) |

There is no separate database server, cache server (e.g., Redis), message broker (e.g., RabbitMQ), or background worker process. All inter-subsystem communication happens in process memory — no network hops between components.

This architecture simplifies deployment (a single process to start and monitor) and removes infrastructure dependencies, at the cost of horizontal scalability and persistence.

---

## Authentication and Access Control Model

**Requirement:** The application has no user account system, no login flow, no email addresses, and no passwords.

**Facilitator access** is controlled by a single secret token (a UUID) generated at session creation. The token is passed in URLs and request bodies. It is not transmitted as a cookie or Authorization header. It grants elevated control over the session to whoever holds it.

The client persists the facilitator token in `localStorage` under the key **`wa-facilitator-token-{sessionId}`** (where `{sessionId}` is the 8-character session ID). This key is read on page load as a fallback when the `?token=` query parameter is absent — for example, when the facilitator refreshes the page. All implementations must use this exact key name.

**Engineer access** requires only a name. Engineers identify themselves by typing their display name on the join screen. There is no verification that the name is authentic. Engineers with the same name are treated as the same person by the reconnection logic.

**Read access** to session state and exports is unrestricted. Anyone who knows the session ID can fetch the session state, activity list, and generate the export. The session ID is the only barrier to read access.

The access control model is designed for trusted team environments (a company's engineering team using the tool in a retro context) where social trust replaces technical authentication.

---

## Session Lifetime

**Requirement:** Sessions live as long as the server process is running. There is no scheduled session expiry, no cleanup job, and no maximum session age.

Sessions accumulate in memory indefinitely until the process restarts. In practice, sessions are expected to be short-lived (1–2 hours for a retro), and the server is expected to be restarted between distinct uses. The application provides no mechanism to archive, delete, or expire individual sessions while the server is running.

**There is no session cleanup mechanism.** If many sessions are created over a long server uptime, memory usage grows proportionally. This is acceptable given the intended deployment model (short-lived server runs, manual restarts between uses).

---

## Export Availability

**Requirement:** The session export endpoint (`GET /api/sessions/:id/export`) is publicly accessible. No authentication token is required.

Any caller who knows the session ID can generate and retrieve the full session export in Markdown format via the REST endpoint or MCP tool. The facilitator also has an in-app export modal; engineers have no export UI — only API/MCP access.

The rationale: the export is a read-only snapshot of the session's output. It does not contain the facilitator token. Making it publicly accessible allows engineers to generate their own copy of the session summary without requiring the facilitator's involvement after the session ends.

---

## MCP Server — Read-Only Constraint

**Requirement:** The MCP server exposed at `/mcp` must be read-only. It must not provide any tool that creates sessions, submits activities, modifies activities, classifies activities, flags activities, or performs any other write operation.

The MCP server's role is to give AI assistants a structured way to read session data and generate exports. All write operations — including activity submission, classification, flagging, merging, and session lifecycle control — must be performed via the web UI or the REST API.

This constraint applies to all four currently defined MCP tools (`list_sessions`, `get_session`, `export_session_markdown`, `list_activities`) and must be maintained when adding any future tools to the MCP server.

See [../07-mcp-server/tools.md](../07-mcp-server/tools.md) for the full tool definitions.

---

## Summary Table

| Constraint | Value |
|---|---|
| Max participants per session | 20 concurrent engineers |
| Mobile support required for | Engineer join screen and submission board |
| Storage backend | In-memory only; no database or file system |
| Number of server processes | 1 (single Node.js process) |
| Server port | `30{N}0` per experiment (e.g. 3050 for exp-05, 3060 for exp-06); configurable via `PORT` env var |
| Authentication system | None (token for facilitator, name only for engineers) |
| Session expiry | None (sessions last until server restart) |
| Export authentication | None required (public read) |
| MCP write operations | Not permitted; MCP is read-only |
