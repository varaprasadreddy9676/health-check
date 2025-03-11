import { Router } from 'express';
import logger from '../utils/logger';
import { getHealthCheckRepository } from '../repositories/factory';
import { getIncidentRepository } from '../repositories/factory';

const router = Router();

// GET /api/status/summary - Get current system status
router.get('/summary', async (req, res) => {
  try {
    const healthCheckRepository = getHealthCheckRepository();
    const incidentRepository = getIncidentRepository();
    
    // Get active incidents
    const activeIncidents = await incidentRepository.findActive();
    
    // Get all health checks
    const healthChecks = await healthCheckRepository.findAll({ enabled: true });
    
    // Get latest results for health checks
    const latestResults = await healthCheckRepository.getLatestResults();
    
    // Count unhealthy checks
    const unhealthyChecks = latestResults.filter(result => result.status === 'Unhealthy');
    
    // Determine overall status
    let overallStatus = 'operational';
    if (activeIncidents.length > 0 || unhealthyChecks.length > 0) {
      overallStatus = unhealthyChecks.length > healthChecks.length / 2 ? 'major_outage' : 'partial_outage';
    }
    
    return res.status(200).json({
      success: true,
      data: {
        status: overallStatus,
        activeIncidents: activeIncidents.length,
        unhealthyChecks: unhealthyChecks.length,
        totalChecks: healthChecks.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({
      msg: 'Error getting status summary',
      error: error instanceof Error ? error.message : String(error),
    });
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while getting the status summary',
      },
    });
  }
});

// GET /api/status/components - Get component status
router.get('/components', async (req, res) => {
  try {
    const healthCheckRepository = getHealthCheckRepository();
    
    // Get latest results for all health checks
    const latestResults = await healthCheckRepository.getLatestResults();
    
    // Format the data
    const components = latestResults.map(result => ({
      id: result.healthCheckId,
      name: result.healthCheck?.name || 'Unknown',
      type: result.healthCheck?.type || 'Unknown',
      status: result.status,
      lastChecked: result.createdAt,
    }));
    
    return res.status(200).json({
      success: true,
      data: components,
    });
  } catch (error) {
    logger.error({
      msg: 'Error getting component status',
      error: error instanceof Error ? error.message : String(error),
    });
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while getting component status',
      },
    });
  }
});

// GET /api/status/history - Get status history
router.get('/history', async (req, res) => {
  try {
    const incidentRepository = getIncidentRepository();
    const { days = 7 } = req.query;
    const daysNum = Math.min(Number(days), 30); // Limit to 30 days

    // Fetch incident history from the repository
    const historyData = await incidentRepository.getHistory(daysNum);

    return res.status(200).json({
      success: true,
      data: historyData,
    });
  } catch (error) {
    logger.error({
      msg: 'Error getting status history',
      error: error instanceof Error ? error.message : String(error),
    });
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while getting status history',
      },
    });
  }
});

export default router;