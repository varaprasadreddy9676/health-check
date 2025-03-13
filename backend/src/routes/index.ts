import { Router } from 'express';
import healthCheckRoutes from './healthCheckRoutes';
import resultRoutes from './resultRoutes';
import notificationRoutes from './notificationRoutes';
import statusRoutes from './statusRoutes';
import { statusController } from '../controllers/statusController';
import settingRoutes from './settingRoutes';

// Create main router
const router = Router();

// Mount routes
router.use('/healthchecks', healthCheckRoutes);
router.use('/results', resultRoutes);
router.use('/notifications', notificationRoutes);
router.use('/status', statusRoutes);

// System health endpoint at the root API level
router.get('/health', statusController.getHealth);
router.use('/settings', settingRoutes);

export default router;