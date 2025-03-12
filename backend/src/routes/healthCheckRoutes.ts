import { Router } from 'express';
import { healthCheckController } from '../controllers/healthCheckController';

// Create router
const router = Router();

// Health Check Routes
router.get('/', healthCheckController.getAll);
router.post('/', healthCheckController.validateHealthCheck, healthCheckController.create);

router.get('/metrics', healthCheckController.getMetrics);

router.get('/:id', healthCheckController.getById);
router.put('/:id', healthCheckController.validateHealthCheck, healthCheckController.update);
router.delete('/:id', healthCheckController.delete);

router.patch('/:id/toggle', healthCheckController.toggle);
router.post('/:id/force-check', healthCheckController.forceCheck);
router.post('/:id/restart', healthCheckController.restartService);

export default router;