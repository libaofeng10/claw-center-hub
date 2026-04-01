import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { getLogsFromCli } from '../services/cli-service.js';

const router = Router();

function getLogDir(): string {
  return process.env.OPENCLAW_LOG_DIR || '/tmp/openclaw';
}

function getTodayLogPath(): string {
  const today = new Date().toISOString().slice(0, 10);
  return path.join(getLogDir(), `openclaw-${today}.log`);
}

// GET /api/logs
router.get('/', async (req: Request, res: Response) => {
  try {
    const source = req.query.source || 'file';
    const lines = parseInt(req.query.lines as string) || 200;
    const filter = (req.query.filter as string) || '';
    const level = (req.query.level as string) || '';

    if (source === 'cli') {
      const result = await getLogsFromCli(lines);
      let logLines = result.stdout.split('\n');
      if (filter) {
        logLines = logLines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()));
      }
      if (level) {
        logLines = logLines.filter((l) => l.toUpperCase().includes(level.toUpperCase()));
      }
      return res.json({ lines: logLines, source: 'cli' });
    }

    const logPath = getTodayLogPath();
    let content = '';
    try {
      content = await fs.readFile(logPath, 'utf-8');
    } catch {
      return res.json({ lines: [], source: 'file', message: 'No log file found for today' });
    }

    let logLines = content.split('\n').filter(Boolean);

    if (filter) {
      logLines = logLines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()));
    }
    if (level) {
      logLines = logLines.filter((l) => l.toUpperCase().includes(level.toUpperCase()));
    }

    logLines = logLines.slice(-lines);

    res.json({ lines: logLines, source: 'file', path: logPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
