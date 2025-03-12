import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { healthCheckRepository } from '../repositories/healthCheckRepository';
import { healthCheckService } from '../services/healthCheckService';
import { HealthCheckType } from '../models/HealthCheck';
import { createError } from '../utils/error';
import logger from '../utils/logger';

// Health Check Controller
export class HealthCheckController {
  /**
   * Validation rules for health check creation/update
   */
  validateHealthCheck = [
    body('name').notEmpty().withMessage('Name is required'),
    body('type').isIn(['API', 'PROCESS', 'SERVICE', 'SERVER']).withMessage('Type must be one of: API, PROCESS, SERVICE, SERVER'),
    body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
    body('checkInterval').optional().isInt({ min: 10 }).withMessage('Check interval must be at least 10 seconds'),
    body('notifyOnFailure').optional().isBoolean().withMessage('NotifyOnFailure must be a boolean'),
    
    // Type-specific validation
    body('endpoint').if(body('type').equals('API')).notEmpty().withMessage('Endpoint is required for API checks'),
    body('timeout').if(body('type').equals('API')).optional().isInt({ min: 1000 }).withMessage('Timeout must be at least 1000ms'),
    
    body('processKeyword').if(body('type').equals('PROCESS')).notEmpty().withMessage('Process keyword is required for PROCESS checks'),
    body('port').if(body('type').equals('PROCESS')).optional().isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535'),
    
    body('customCommand').if(body('type').equals('SERVICE')).notEmpty().withMessage('Custom command is required for SERVICE checks'),
    body('expectedOutput').if(body('type').equals('SERVICE')).optional(),
    
    body('restartCommand').optional()
  ];
  
  /**
   * Get all health checks
   */
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const { type, enabled } = req.query;
      const filter: { type?: HealthCheckType; enabled?: boolean } = {};
      
      if (type) {
        filter.type = type as HealthCheckType;
      }
      
      if (enabled !== undefined) {
        filter.enabled = enabled === 'true';
      }
      
      const healthChecks = await healthCheckRepository.findAll(filter);
      
      return res.status(200).json({
        success: true,
        data: healthChecks
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting health checks',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve health checks'
        }
      });
    }
  }
  
  /**
   * Get health check by ID
   */
  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const healthCheck = await healthCheckRepository.findById(id);
      
      if (!healthCheck) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Health check with ID ${id} not found`
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        data: healthCheck
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting health check by ID',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve health check'
        }
      });
    }
  }
  
  /**
   * Create a new health check
   */
  async create(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }
      
      const healthCheck = await healthCheckRepository.create(req.body);
      
      return res.status(201).json({
        success: true,
        data: healthCheck
      });
    } catch (error) {
      logger.error({
        msg: 'Error creating health check',
        error: error instanceof Error ? error.message : String(error),
        data: req.body
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create health check'
        }
      });
    }
  }
  
  /**
   * Update a health check
   */
  async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }
      
      const healthCheck = await healthCheckRepository.update(id, req.body);
      
      if (!healthCheck) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Health check with ID ${id} not found`
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        data: healthCheck
      });
    } catch (error) {
      logger.error({
        msg: 'Error updating health check',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
        data: req.body
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update health check'
        }
      });
    }
  }
  
  /**
   * Delete a health check
   */
  async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const success = await healthCheckRepository.delete(id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Health check with ID ${id} not found`
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        data: { message: 'Health check deleted successfully' }
      });
    } catch (error) {
      logger.error({
        msg: 'Error deleting health check',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete health check'
        }
      });
    }
  }
  
  /**
   * Toggle health check enabled status
   */
  async toggle(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const healthCheck = await healthCheckRepository.toggle(id);
      
      if (!healthCheck) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Health check with ID ${id} not found`
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        data: healthCheck
      });
    } catch (error) {
      logger.error({
        msg: 'Error toggling health check',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to toggle health check'
        }
      });
    }
  }
  
  /**
   * Force execute a health check
   */
  async forceCheck(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const result = await healthCheckService.forceHealthCheck(id);
      
      return res.status(200).json({
        success: true,
        data: {
          isHealthy: result.isHealthy,
          status: result.status,
          details: result.details,
          cpuUsage: result.cpuUsage,
          memoryUsage: result.memoryUsage,
          responseTime: result.responseTime,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error forcing health check',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to execute health check'
        }
      });
    }
  }
  
  /**
   * Restart a service
   */
  async restartService(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const result = await healthCheckService.restartService(id);
      
      return res.status(200).json({
        success: result.success,
        data: {
          details: result.details,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error restarting service',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to restart service'
        }
      });
    }
  }
  
  /**
   * Get health check metrics
   */
  async getMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const metrics = await healthCheckRepository.getMetrics();
      
      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting health check metrics',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve health check metrics'
        }
      });
    }
  }
}

// Export controller instance
export const healthCheckController = new HealthCheckController();