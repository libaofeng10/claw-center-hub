import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import agentsRouter from './routes/agents.js';
import gatewayRouter from './routes/gateway.js';
import channelsRouter from './routes/channels.js';
import configRouter from './routes/config.js';
import catalogRouter from './routes/catalog.js';
import logsRouter from './routes/logs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '4310', 10);
const HOST = process.env.HOST || '127.0.0.1';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const authToken = process.env.AUTH_TOKEN;
if (authToken) {
  app.use('/api', (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== authToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
}

app.use('/api/agents', agentsRouter);
app.use('/api/gateway', gatewayRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/config', configRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/logs', logsRouter);

if (process.env.NODE_ENV === 'production') {
  const projectRoot = path.resolve(__dirname, '../..');
  const clientDist = path.join(projectRoot, 'dist', 'client');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`[OpenClaw Control Center] running at http://${HOST}:${PORT}`);
});
