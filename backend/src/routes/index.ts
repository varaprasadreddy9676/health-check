import { Router } from 'express';
import healthCheckRoutes from './healthCheckRoutes';
import healthCheckResultRoutes from './healthCheckResultRoutes';
import incidentRoutes from './incidentRoutes';
import notificationRoutes from './notificationRoutes';
import actionRoutes from './actionRoutes';
import statusRoutes from './statusRoutes';

const router = Router();

// API Routes
router.use('/healthchecks', healthCheckRoutes);
router.use('/results', healthCheckResultRoutes);
router.use('/incidents', incidentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/actions', actionRoutes);
router.use('/status', statusRoutes);

// Health endpoint for the API itself
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;