import { Router } from 'express';
import { resultController } from '../controllers/resultController';

// Create router
const router = Router();

// Result Routes
router.get('/latest', resultController.getLatest);
router.get('/:id', resultController.getHistoricalByHealthCheckId);
router.get('/:id/logs', resultController.getLogDetails);

export default router;