# Overview

## Product Purpose

Work Audit is a single-session tool that replaces the quarterly retrospective. It addresses one central question: "What work are we doing, and should we still be doing it that way?"

During a session, engineers on a team submit the recurring activities they perform. Each activity is tagged along three dimensions: how long it takes each time it occurs (time per occurrence), how often it occurs (frequency), and how it feels to do it (energy level). These three tags combine to produce a calculated effort load in hours per week and a perceived cost that accounts for the emotional weight of the work.

Once submissions close, the facilitator runs a group discussion phase. During discussion, the facilitator classifies each activity as automatable, worth investigating, or permanently manual, and flags the highest-priority items for follow-up. The resulting dataset gives the team a shared, evidence-based picture of their recurring work — not a heated argument, but a structured audit.

Work Audit is designed for teams of up to 20 concurrent engineers. It requires no accounts, no passwords, and no databases. A single URL is all an engineer needs to join. The facilitator receives a separate URL containing a secret token that grants elevated permissions.

---

## Research Context

This application is part of a study on specification-driven development. The study investigates whether high-quality, complete specifications improve the output quality, consistency, and correctness of AI-assisted code generation. Work Audit is the subject application — a realistic, non-trivial product with multiple interacting subsystems — chosen specifically because it is complex enough to stress-test the hypothesis.

The specification files in this repository are the primary artifact under study. They are written before any implementation, and implementation is expected to follow from the spec rather than the reverse. Any deviation between the spec and the implementation is treated as a signal for analysis, not as an acceptable shortcut.

---

## Output Surfaces

Work Audit ships four distinct output surfaces. All four are served from a single Node.js process running on a single port (default 3000).

### Web UI

The primary interface for both facilitators and engineers. Built with Next.js (App Router) and rendered server-side where appropriate. The facilitator and engineer UIs are visually and functionally distinct — they share a session but see different controls, different views, and different information at each lifecycle phase. The web UI communicates with the server via both HTTP (for initial page loads) and WebSocket (for real-time updates during active sessions).

### REST API

A conventional HTTP API that exposes session management operations. The REST API allows external tooling to create sessions, inspect session state, and retrieve results. All facilitator-only operations require the facilitator token to be passed as a query parameter. The REST API is the integration point for CI pipelines, export scripts, and any client that cannot use WebSocket.

### MCP Server

A Model Context Protocol server that exposes Work Audit operations as tools callable by AI assistants. The MCP server allows an AI agent to create and manage sessions, submit activities on behalf of an engineer, and retrieve session results programmatically. This surface is intended for agentic workflows where Work Audit is embedded in a larger AI-driven retrospective process.

### AI Skills

A set of pre-written prompt patterns and structured instructions that allow an AI assistant to act as a facilitator or co-facilitator during a Work Audit session. The AI skills surface is not a programmatic API — it is a set of human-readable interaction patterns that guide an AI through the facilitator workflow using the other surfaces as tools.

---

## Technology Stack

The implementation uses the following technologies. This section is informational; the spec does not prescribe implementation details beyond what is listed here.

- **Runtime:** Node.js, single process
- **Web framework:** Next.js with App Router
- **Real-time transport:** Socket.io over WebSocket
- **Language:** TypeScript throughout all surfaces
- **Styling:** Tailwind CSS utility classes plus a custom CSS design system
- **Storage:** In-memory only. No database. No file writes. All data is lost when the process restarts.
- **Authentication:** None. Facilitator access is controlled solely by the presence of a secret token in the URL query parameter.
