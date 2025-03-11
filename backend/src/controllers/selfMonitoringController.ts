import { Request, Response } from 'express';
import { selfMonitoringService } from '../services/selfMonitoringService';
import { isDatabaseAvailable } from '../repositories/factory';
import logger from '../utils/logger';

export const selfMonitoringController = {
  /**
   * Get detailed system status
   */
  getStatus: async (req: Request, res: Response) => {
    try {
      const status = selfMonitoringService.getStatus();
      
      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting system status',
        error: error instanceof Error ? error.message : String(error),
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while getting system status',
        },
      });
    }
  },
  
  /**
   * Get simple health check for the application
   * This is designed to be called by external monitoring systems
   */
  getHealth: async (req: Request, res: Response) => {
    try {
      const status = selfMonitoringService.getStatus();
      const dbConnected = isDatabaseAvailable();
      
      // Determine appropriate status code based on health
      let statusCode = 200;
      let health = 'healthy';
      
      if (status.services.some(s => s.status === 'failing')) {
        statusCode = 503; // Service Unavailable
        health = 'unhealthy';
      } else if (!dbConnected || status.services.some(s => s.status === 'degraded')) {
        statusCode = 200; // Still OK but with warnings
        health = 'degraded';
      }
      
      return res.status(statusCode).json({
        status: health,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        message: health === 'healthy' 
          ? 'Service is healthy' 
          : (health === 'degraded' 
            ? 'Service is degraded but still functioning' 
            : 'Service is unhealthy')
      });
    } catch (error) {
      // Even in case of error, return 200 with error info
      // This ensures the monitoring system knows the API is still responding
      logger.error({
        msg: 'Error in health check endpoint',
        error: error instanceof Error ? error.message : String(error),
      });
      
      return res.status(200).json({
        status: 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        message: 'Error in health check',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
};