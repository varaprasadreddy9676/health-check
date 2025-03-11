import { Router } from 'express';
import healthCheckRoutes from './healthCheckRoutes';
import healthCheckResultRoutes from './healthCheckResultRoutes';
import incidentRoutes from './incidentRoutes';
import notificationRoutes from './notificationRoutes';
import actionRoutes from './actionRoutes';
import statusRoutes from './statusRoutes';
import { selfMonitoringController } from '../controllers/selfMonitoringController';

const router = Router();

// API Routes
router.use('/healthchecks', healthCheckRoutes);
router.use('/results', healthCheckResultRoutes);
router.use('/incidents', incidentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/actions', actionRoutes);
router.use('/status', statusRoutes);

// Health endpoint for the API itself (always available even if DB is down)
router.get('/health', selfMonitoringController.getHealth);

// System status endpoint
router.get('/system-status', selfMonitoringController.getStatus);


export default router;