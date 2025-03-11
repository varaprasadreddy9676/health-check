import { Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import logger from '../utils/logger';
import { getHealthCheckRepository } from '../repositories/factory';

export const healthCheckResultController = {
  // Validation rules for getting results
  validateGetResults: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['Healthy', 'Unhealthy']).withMessage('Status must be either Healthy or Unhealthy'),
    query('from').optional().isISO8601().withMessage('From date must be in ISO format'),
    query('to').optional().isISO8601().withMessage('To date must be in ISO format'),
  ],

  // Get latest results for all health checks
  getLatest: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const latestResults = await healthCheckRepository.getLatestResults();
      
      return res.status(200).json({
        success: true,
        data: latestResults,
      });
    } catch (error) {
      logger.error({
        msg: 'Error fetching latest health check results',
        error: error instanceof Error ? error.message : String(error),
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching health check results',
        },
      });
    }
  },

  // Get historical results for a specific health check
  getHistoricalByCheckId: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      // Validate health check exists
      const healthCheck = await healthCheckRepository.findById(id);
      
      if (!healthCheck) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Health check with ID ${id} not found`,
          },
        });
      }
      
      // Get results with pagination
      const { results, total } = await healthCheckRepository.getResultsByCheckId(
        id, 
        Number(page), 
        Number(limit)
      );
      
      return res.status(200).json({
        success: true,
        data: results,
        pagination: {
          total,
          page: Number(page),
          pageSize: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error fetching historical health check results',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId: req.params.id,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching historical health check results',
        },
      });
    }
  },

  // Get all health check results with filtering and pagination
  getAll: async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }
      
      // This would need to be implemented in your repository
      // For now, we'll return an error indicating it's not implemented
      
      return res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'This endpoint is not yet implemented with the repository pattern',
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error fetching health check results',
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching health check results',
        },
      });
    }
  },

  // Get health check metrics
  getMetrics: async (req: Request, res: Response) => {
    try {
      // This would need to be implemented in your repository
      // For now, we'll return some mockup data
      
      return res.status(200).json({
        success: true,
        data: {
          uptime24h: 98.5,
          incidentCount: 2,
          checksByType: {
            API: 3,
            PROCESS: 2,
            SERVICE: 1,
            SERVER: 1
          },
          totalChecks: 50,
          healthyChecks: 48,
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error fetching health check metrics',
        error: error instanceof Error ? error.message : String(error),
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching health check metrics',
        },
      });
    }
  },
};