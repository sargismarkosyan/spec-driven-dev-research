import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Build a fresh server instance per request (stateless mode).
// For stateful sessions add a session map and sessionIdGenerator.
const buildServer = () => {
  const server = new McpServer({
    name: 'toil-tracker',
    version: '0.1.0',
  });

  // ── Tools ──────────────────────────────────────────────────────────────────
  // Placeholder — replace with domain tools when extending the starter.

  server.tool(
    'get_status',
    'Returns the current status of the Toil Tracker server.',
    {},
    async () => ({
      content: [{ type: 'text', text: 'Toil Tracker MCP server is running.' }],
    })
  );

  // Add domain tools here:
  // server.tool('create_session', ...)
  // server.tool('add_activity', ...)
  // server.tool('list_activities', ...)

  return server;
};

export const setupMCP = (app: Express) => {
  app.post('/mcp', async (req: Request, res: Response) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });
};
