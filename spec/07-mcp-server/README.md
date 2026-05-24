# 07 — MCP Server

The Work Audit application exposes a Model Context Protocol (MCP) server that allows AI assistants (such as Claude) to read session data and generate exports without going through the web UI.

## Transport

The MCP server uses the Streamable HTTP transport from the `@modelcontextprotocol/sdk`. It is mounted at the `/mcp` path on the same Express server that handles the REST API and Socket.io. Both GET and POST requests to `/mcp` are handled.

The MCP server is **read-only**. It can fetch session state and generate exports, but it cannot create sessions, submit activities, classify activities, flag activities, or perform any write operation. All writes must go through the web UI or the REST API.

No authentication is required to call MCP tools.

## Response Format

All MCP tool responses use the standard MCP content format:

The response object contains a `content` array. Each element of the array has `type` set to `"text"` and `text` set to the JSON-stringified result of the tool operation.

## Table of Contents

| File | Contents |
|---|---|
| [tools.md](./tools.md) | Complete specification of all four MCP tools: inputs, outputs, filtering options, and computed fields |

## Related Sections

- AI skills that use MCP tools as their data source: see [../08-ai-skills/README.md](../08-ai-skills/README.md)
- Non-functional constraint on MCP read-only nature: see [../11-non-functional/README.md](../11-non-functional/README.md)
