import { Router } from 'express';
import { healthCheckController } from '../controllers/healthCheckController';

const router = Router();

// POST /api/actions/:id/restart - Restart a service
router.post('/:id/restart', healthCheckController.restart);

// POST /api/actions/:id/force-check - Force a health check
router.post('/:id/force-check', healthCheckController.forceCheck);

export default router;