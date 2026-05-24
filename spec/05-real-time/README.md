# 05 — Real-Time Communication

The Work Audit application uses Socket.io for all real-time communication between the server and every participant in a session. All socket events are scoped to a room named after the session ID, so every broadcast reaches all participants simultaneously.

## Architecture

The Socket.io server shares a single Node.js HTTP server with Express and Next.js. No separate WebSocket server or message broker is used. When a participant opens the application, the browser establishes a Socket.io connection to the server, and all real-time interactions flow over that persistent connection.

Every participant — engineers and the facilitator alike — joins the same Socket.io room (named by the session ID) upon connecting. This means every broadcast event reaches every participant in the session at the same time.

## Table of Contents

| File | Contents |
|---|---|
| [client-to-server.md](./client-to-server.md) | All events emitted by the browser to the server, including payloads, validation rules, and server-side behavior |
| [server-to-client.md](./server-to-client.md) | All events broadcast by the server to clients, including payloads and expected client-side behavior |

## Related Sections

- REST endpoints that trigger socket broadcasts: see [../06-rest-api/README.md](../06-rest-api/README.md)
- Permission rules that govern event handling: see [../10-business-rules/permissions.md](../10-business-rules/permissions.md)
- Reconnection behavior and socket ID rebinding: see [../10-business-rules/reconnection.md](../10-business-rules/reconnection.md)
