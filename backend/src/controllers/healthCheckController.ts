import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import logger from '../utils/logger';
import { AppError, errorTypes } from '../utils/error';
import { healthCheckService } from '../services/healthCheckService';
import { getHealthCheckRepository } from '../repositories/factory';

// Controller for health check operations
export const healthCheckController = {
  // Validation rules for health check creation/update
  validateHealthCheck: [
    body('name').notEmpty().withMessage('Name is required'),
    body('type').isIn(['API', 'PROCESS', 'SERVICE', 'SERVER']).withMessage('Type must be one of: API, PROCESS, SERVICE, SERVER'),
    body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
    body('checkInterval').optional().isInt({ min: 10 }).withMessage('Check interval must be at least 10 seconds'),
    body('endpoint').if(body('type').equals('API')).notEmpty().withMessage('Endpoint is required for API checks'),
    body('processKeyword').if(body('type').equals('PROCESS')).notEmpty().withMessage('Process keyword is required for PROCESS checks'),
    body('customCommand').if(body('type').equals('SERVICE')).notEmpty().withMessage('Custom command is required for SERVICE checks'),
    body('expectedOutput').if(body('type').equals('SERVICE')).optional(),
    body('port').if(body('type').equals('PROCESS')).optional().isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535'),
    body('timeout').optional().isInt({ min: 1000 }).withMessage('Timeout must be at least 1000ms'),
    body('restartCommand').optional(),
    body('notifyOnFailure').optional().isBoolean().withMessage('NotifyOnFailure must be a boolean'),
  ],

  // Get all health checks
  getAll: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const { type, status } = req.query;
      
      // Build filter options
      const filter: any = {};
      
      if (type) {
        filter.type = type as string;
      }
      
      if (status === 'active') {
        filter.enabled = true;
      } else if (status === 'inactive') {
        filter.enabled = false;
      }
      
      // Get health checks
      const healthChecks = await healthCheckRepository.findAll(filter);
      
      // Return success response
      return res.status(200).json({
        success: true,
        data: healthChecks,
      });
    } catch (error) {
      logger.error({
        msg: 'Error fetching health checks',
        error: error instanceof Error ? error.message : String(error),
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching health checks',
        },
      });
    }
  },

  // Get a single health check by ID
  getById: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const { id } = req.params;
      
      // Get health check
      const healthCheck = await healthCheckRepository.findById(id);
      
      // Check if health check exists
      if (!healthCheck) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Health check with ID ${id} not found`,
          },
        });
      }
      
      // Return success response
      return res.status(200).json({
        success: true,
        data: healthCheck,
      });
    } catch (error) {
      logger.error({
        msg: 'Error fetching health check',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching the health check',
        },
      });
    }
  },

  // Create a new health check
  create: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      
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
      
      // Set default values
      const healthCheckData = {
        ...req.body,
        enabled: req.body.enabled !== undefined ? req.body.enabled : true,
        checkInterval: req.body.checkInterval || 300,
        notifyOnFailure: req.body.notifyOnFailure !== undefined ? req.body.notifyOnFailure : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Create health check
      const healthCheck = await healthCheckRepository.create(healthCheckData);
      
      // Return success response
      return res.status(201).json({
        success: true,
        data: healthCheck,
      });
    } catch (error) {
      logger.error({
        msg: 'Error creating health check',
        error: error instanceof Error ? error.message : String(error),
        data: req.body,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while creating the health check',
        },
      });
    }
  },

  // Update an existing health check
  update: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const { id } = req.params;
      
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
      
      // Check if health check exists
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
      
      // Update health check
      const updateData = {
        ...req.body,
        updatedAt: new Date()
      };
      
      const updatedHealthCheck = await healthCheckRepository.update(id, updateData);
      
      // Return success response
      return res.status(200).json({
        success: true,
        data: updatedHealthCheck,
      });
    } catch (error) {
      logger.error({
        msg: 'Error updating health check',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
        data: req.body,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while updating the health check',
        },
      });
    }
  },

  // Delete a health check
  delete: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const { id } = req.params;
      
      // Check if health check exists
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
      
      // Delete health check
      const success = await healthCheckRepository.delete(id);
      
      if (!success) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete health check',
          },
        });
      }
      
      // Return success response
      return res.status(200).json({
        success: true,
        data: { message: 'Health check deleted successfully' },
      });
    } catch (error) {
      logger.error({
        msg: 'Error deleting health check',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while deleting the health check',
        },
      });
    }
  },

  // Toggle health check (enable/disable)
  toggle: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const { id } = req.params;
      
      // Check if health check exists
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
      
      // Toggle enabled status
      const updatedHealthCheck = await healthCheckRepository.update(id, {
        enabled: !healthCheck.enabled,
        updatedAt: new Date()
      });
      
      // Return success response
      return res.status(200).json({
        success: true,
        data: updatedHealthCheck,
      });
    } catch (error) {
      logger.error({
        msg: 'Error toggling health check',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while toggling the health check',
        },
      });
    }
  },

  // Force a health check
  forceCheck: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const { id } = req.params;
      
      // Check if health check exists
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
      
      // Execute health check
      const result = await healthCheckService.forceHealthCheck(id);
      
      // Return success response
      return res.status(200).json({
        success: true,
        data: {
          isHealthy: result.isHealthy,
          details: result.details,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error forcing health check',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while executing the health check',
        },
      });
    }
  },

  // Restart a service
  restart: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const { id } = req.params;
      
      // Check if health check exists
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
      
      // Execute restart command
      const result = await healthCheckService.restartService(id);
      
      // Return success response
      return res.status(200).json({
        success: result.success,
        data: {
          details: result.details,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error restarting service',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while restarting the service',
        },
      });
    }
  },
};