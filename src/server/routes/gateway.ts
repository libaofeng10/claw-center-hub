import { Router, Request, Response } from 'express';
import { getGatewayStatus, restartGateway } from '../services/cli-service.js';
import { getGatewayHealth, getGatewayInfo } from '../services/gateway-client.js';

const router = Router();

// GET /api/gateway/status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [cliStatus, health, info] = await Promise.all([
      getGatewayStatus(),
      getGatewayHealth(),
      getGatewayInfo(),
    ]);

    res.json({
      cli: {
        output: cliStatus.stdout,
        error: cliStatus.stderr,
        exitCode: cliStatus.exitCode,
      },
      health: health.ok ? health.data : null,
      info: info.ok ? info.data : null,
      reachable: health.ok,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gateway/restart
router.post('/restart', async (_req: Request, res: Response) => {
  try {
    const result = await restartGateway();
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
