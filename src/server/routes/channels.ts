import { Router, Request, Response } from 'express';
import { getChannelsStatus } from '../services/cli-service.js';
import {
  readJsonFile,
  getOpenclawConfigPath,
  sanitizeObject,
} from '../services/file-service.js';

const router = Router();

// GET /api/channels/status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const cliResult = await getChannelsStatus();

    let channelConfig: unknown = null;
    try {
      const config = await readJsonFile<Record<string, unknown>>(getOpenclawConfigPath());
      if (config.channels) {
        channelConfig = sanitizeObject(config.channels);
      }
    } catch {
      // config read failed, non-critical
    }

    res.json({
      probe: {
        output: cliResult.stdout,
        error: cliResult.stderr,
        exitCode: cliResult.exitCode,
      },
      config: channelConfig,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
