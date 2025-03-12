import { Router } from 'express';
import { statusController } from '../controllers/statusController';

// Create router
const router = Router();

// Status Routes
router.get('/health', statusController.getHealth);
router.get('/summary', statusController.getSummary);
router.get('/components', statusController.getComponents);

export default router;