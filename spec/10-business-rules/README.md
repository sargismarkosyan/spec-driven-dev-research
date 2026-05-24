# 10 — Business Rules

This section documents all the application-specific logic that governs behavior beyond simple CRUD operations. These rules apply uniformly across both the REST API and the real-time Socket.io interface.

## Overview

Business rules in Work Audit fall into six categories:

- **Permissions:** Who is allowed to perform which action on which resource
- **Timer rules:** How the submission countdown is calculated, displayed, and extended
- **Merge rules:** What constitutes a valid merge, how candidates are found, and what the merged record looks like
- **Suggestion rules:** How the engineer's suggestion feed is built from teammates' activities
- **Soft delete:** The engineer's undo window before a delete is permanently committed
- **Reconnection:** How a returning participant's identity and activity ownership are restored after a socket disconnect

## Table of Contents

| File | Contents |
|---|---|
| [permissions.md](./permissions.md) | Role-based access control matrix for all session and activity operations |
| [timer-rules.md](./timer-rules.md) | Countdown calculation, display format, urgency threshold, and snap-forward extend logic |
| [merge-rules.md](./merge-rules.md) | Merge prerequisites, similarity scoring, merged result structure, source record mutation, and display rules |
| [suggestion-rules.md](./suggestion-rules.md) | How suggestions are derived from the team feed, deduplication, filtering, and tap behavior |
| [soft-delete.md](./soft-delete.md) | Engineer-side optimistic delete with a 5-second undo window before server commit |
| [reconnection.md](./reconnection.md) | Name-based socket rebinding, activity re-targeting, facilitator reconnection, and persistence caveats |

## Related Sections

- Endpoints that enforce these rules: [../06-rest-api/README.md](../06-rest-api/README.md)
- Socket events that enforce these rules: [../05-real-time/client-to-server.md](../05-real-time/client-to-server.md)
