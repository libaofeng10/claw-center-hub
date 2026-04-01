import { Router, Request, Response } from 'express';
import {
  readJsonFile,
  fileExists,
  getAgentCatalogPath,
} from '../services/file-service.js';
import { regenerateCatalog } from '../services/cli-service.js';

const router = Router();

// GET /api/catalog
router.get('/', async (_req: Request, res: Response) => {
  try {
    const catalogPath = getAgentCatalogPath();
    if (!(await fileExists(catalogPath))) {
      return res.json({ catalog: null, exists: false });
    }
    const catalog = await readJsonFile(catalogPath);
    res.json({ catalog, exists: true, path: catalogPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/catalog/regenerate
router.post('/regenerate', async (_req: Request, res: Response) => {
  try {
    const result = await regenerateCatalog();
    res.json({
      ok: result.exitCode === 0,
      output: result.stdout,
      error: result.stderr,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
