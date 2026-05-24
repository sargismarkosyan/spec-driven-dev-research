import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupMCP } from './mcp';
import { registerSessionRoutes } from '../lib/server/routes/sessions';
import { registerActivityRoutes } from '../lib/server/routes/activities';
import { setupSocketHandlers } from '../lib/server/socket/handlers';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3060', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  registerSessionRoutes(app, io);
  registerActivityRoutes(app, io);
  setupMCP(app);
  setupSocketHandlers(io);

  app.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
