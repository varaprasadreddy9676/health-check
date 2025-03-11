import { Router } from 'express';
import { healthCheckController } from '../controllers/healthCheckController';

const router = Router();

// GET /api/healthchecks - Get all health checks
router.get('/', healthCheckController.getAll);

// POST /api/healthchecks - Create a new health check
router.post('/', healthCheckController.validateHealthCheck, healthCheckController.create);

// GET /api/healthchecks/:id - Get a health check by ID
router.get('/:id', healthCheckController.getById);

// PUT /api/healthchecks/:id - Update a health check
router.put('/:id', healthCheckController.validateHealthCheck, healthCheckController.update);

// DELETE /api/healthchecks/:id - Delete a health check
router.delete('/:id', healthCheckController.delete);

// PATCH /api/healthchecks/:id/toggle - Toggle a health check (enable/disable)
router.patch('/:id/toggle', healthCheckController.toggle);

export default router;