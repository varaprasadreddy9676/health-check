import { Request, Response } from 'express';
import { healthCheckRepository } from '../repositories/healthCheckRepository';
import { schedulerService } from '../services/schedulerService';
import { isDBConnected } from '../config/db';
import logger from '../utils/logger';

// Status Controller
export class StatusController {
  /**
   * Get system health status
   */
  async getHealth(req: Request, res: Response): Promise<Response> {
    try {
      const dbConnected = isDBConnected();
      const schedulerRunning = schedulerService.isSchedulerRunning();
      const activeJobs = schedulerService.getActiveTaskCount();
      
      // Determine overall status
      let status = 'healthy';
      let message = 'All systems operational';
      
      if (!dbConnected || !schedulerRunning) {
        status = 'unhealthy';
        message = 'System degraded';
        
        if (!dbConnected) {
          message += ', database disconnected';
        }
        
        if (!schedulerRunning) {
          message += ', scheduler not running';
        }
      }
      
      return res.status(status === 'healthy' ? 200 : 503).json({
        status,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        scheduler: schedulerRunning ? 'running' : 'stopped',
        activeJobs,
        message
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting system health status',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return res.status(500).json({
        status: 'unhealthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        message: 'Error checking system health'
      });
    }
  }
  
  /**
   * Get status summary
   */
  async getSummary(req: Request, res: Response): Promise<Response> {
    try {
      const latestResults = await healthCheckRepository.getLatestResults();
      const metrics = await healthCheckRepository.getMetrics();
      
      // Calculate overall status
      let overallStatus = 'operational';
      
      const unhealthyCount = latestResults.filter(result => result.status === 'Unhealthy').length;
      
      if (unhealthyCount > 0) {
        overallStatus = unhealthyCount > latestResults.length / 2 
          ? 'major_outage' 
          : 'partial_outage';
      }
      
      return res.status(200).json({
        success: true,
        data: {
          status: overallStatus,
          unhealthyCount,
          totalChecks: metrics.total,
          enabledChecks: metrics.enabled,
          byType: metrics.byType,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting status summary',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve status summary'
        }
      });
    }
  }
  
  /**
   * Get component status (all health checks)
   */
  async getComponents(req: Request, res: Response): Promise<Response> {
    try {
      const latestResults = await healthCheckRepository.getLatestResults();
      
      const components = latestResults.map(result => ({
        id: result.healthCheckId,
        name: result.healthCheck?.name || 'Unknown',
        type: result.healthCheck?.type || 'Unknown',
        status: result.status,
        details: result.details,
        lastChecked: result.createdAt,
        enabled: result.healthCheck?.enabled || false
      }));
      
      return res.status(200).json({
        success: true,
        data: components
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting component status',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve component status'
        }
      });
    }
  }
}

// Export controller instance
export const statusController = new StatusController();