import { Router, Request, Response } from 'express';
import {
  readJsonFile,
  writeJsonFile,
  getOpenclawConfigPath,
  sanitizeObject,
} from '../services/file-service.js';

const router = Router();

// GET /api/config
router.get('/', async (_req: Request, res: Response) => {
  try {
    const configPath = getOpenclawConfigPath();
    const config = await readJsonFile(configPath);
    res.json({
      config: sanitizeObject(config),
      raw: config,
      path: configPath,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/config
router.put('/', async (req: Request, res: Response) => {
  try {
    const configPath = getOpenclawConfigPath();
    await writeJsonFile(configPath, req.body.config);
    res.json({ ok: true, message: 'Config saved. Run "openclaw gateway restart" to apply.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
