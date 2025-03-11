import { Router } from 'express';
import { healthCheckResultController } from '../controllers/healthCheckResultController';

const router = Router();

// GET /api/results/latest - Get latest results for all health checks
router.get('/latest', healthCheckResultController.getLatest);

// GET /api/results/:id - Get historical results for a specific health check
router.get('/:id', healthCheckResultController.getHistoricalByCheckId);

// GET /api/results - Get all health check results with filtering
router.get('/', healthCheckResultController.validateGetResults, healthCheckResultController.getAll);

// GET /api/results/metrics - Get aggregated metrics
router.get('/metrics', healthCheckResultController.getMetrics);

export default router;