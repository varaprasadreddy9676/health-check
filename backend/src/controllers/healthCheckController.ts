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
    body('type').isIn(['API', 'PROCESS', 'SERVICE', 'SERVER', 'LOG']).withMessage('Type must be one of: API, PROCESS, SERVICE, SERVER, LOG'),
    body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
    body('checkInterval').optional().isInt({ min: 10 }).withMessage('Check interval must be at least 10 seconds'),
    body('notifyOnFailure').optional().isBoolean().withMessage('NotifyOnFailure must be a boolean'),
    
    // API type validations
    body('endpoint').if(body('type').equals('API')).notEmpty().withMessage('Endpoint is required for API checks'),
    body('timeout').if(body('type').equals('API')).optional().isInt({ min: 1000 }).withMessage('Timeout must be at least 1000ms'),
    body('expectedStatusCode').if(body('type').equals('API')).optional().isInt().withMessage('Expected status code must be an integer'),
    body('expectedResponseContent').if(body('type').equals('API')).optional().isString().withMessage('Expected response content must be a string'),
    
    // Process type validations
    body('processKeyword').if(body('type').equals('PROCESS')).optional().isString().withMessage('Process keyword must be a string'),
    body('port').if(body('type').equals('PROCESS')).optional().isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535'),
    
    // Service type validations
    body('customCommand').if(body('type').equals('SERVICE')).notEmpty().withMessage('Custom command is required for SERVICE checks'),
    body('expectedOutput').if(body('type').equals('SERVICE')).optional().isString().withMessage('Expected output must be a string'),
    
    // Log type validations
    body('logFilePath').if(body('type').equals('LOG')).notEmpty().withMessage('Log file path is required for LOG checks'),
    body('logFreshnessPeriod').if(body('type').equals('LOG')).optional().isInt({ min: 1 }).withMessage('Log freshness period must be at least 1 minute'),
    body('logErrorPatterns').if(body('type').equals('LOG')).optional().isArray().withMessage('Log error patterns must be an array'),
    body('logMaxSizeMB').if(body('type').equals('LOG')).optional().isInt({ min: 1 }).withMessage('Log max size must be at least 1 MB'),
    
    // Process & Service with log monitoring
    body('logFilePath').if(body('type').custom(type => type === 'PROCESS' || type === 'SERVICE')).optional().isString().withMessage('Log file path must be a string'),
    body('logFreshnessPeriod').if(body('logFilePath').exists()).optional().isInt({ min: 1 }).withMessage('Log freshness period must be at least 1 minute'),
    body('logErrorPatterns').if(body('logFilePath').exists()).optional().isArray().withMessage('Log error patterns must be an array'),
    body('logMaxSizeMB').if(body('logFilePath').exists()).optional().isInt({ min: 1 }).withMessage('Log max size must be at least 1 MB'),
    
    // Restart capabilities
    body('restartCommand').optional().isString().withMessage('Restart command must be a string'),
    body('restartThreshold').optional().isInt({ min: 1 }).withMessage('Restart threshold must be at least 1')
  ];

  async reportRecovery(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      
      const healthCheck = await healthCheckRepository.findById(id);
      if (!healthCheck) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Health check with ID ${id} not found`
          }
        });
      }
      
      // Force a check to verify the service is healthy
      const result = await healthCheckService.executeHealthCheckWithoutNotification(healthCheck);
      
      if (!result.isHealthy) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Cannot report recovery: service is still unhealthy"
          }
        });
      }
      
      // Save the result with the recovery comments
      const updatedResult = await healthCheckRepository.saveResult({
        healthCheckId: id,
        status: result.status,
        details: comments ? `${result.details} (Recovery note: ${comments})` : result.details,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage,
        responseTime: result.responseTime
      });
      
      // Send recovery notification
      await healthCheckService.sendRecoveryNotifications([{
        healthCheck,
        result: {
          ...result,
          details: comments ? `${result.details} (Recovery note: ${comments})` : result.details
        }
      }]);
      
      return res.status(200).json({
        success: true,
        data: {
          message: "Recovery reported and notification sent",
          healthCheck: healthCheck.name,
          status: result.status,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error reporting recovery',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to report recovery"
        }
      });
    }
  }
  
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
  // Add to controllers/healthCheckController.ts
async runAllChecks(req: Request, res: Response): Promise<Response> {
  try {
    // Start the health check process asynchronously
    // This allows us to return a response immediately while checks run in background
    healthCheckService.runAllHealthChecks().catch(error => {
      logger.error({
        msg: 'Error in background health check execution',
        error: error instanceof Error ? error.message : String(error)
      });
    });
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Health check execution started',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error({
      msg: 'Error triggering health checks',
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to trigger health checks'
      }
    });
  }
}
// Add to controllers/healthCheckController.ts
async validateHealthCheckConfig(req: Request, res: Response): Promise<Response> {
  try {
    // Use the existing validation middleware
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
    
    const config = req.body;
    
    // Perform type-specific validation
    let extraValidation: { valid: boolean; message?: string } = { valid: true };
    
    switch (config.type) {
      case 'API':
        if (!config.endpoint) {
          extraValidation = { valid: false, message: 'Endpoint is required for API type health checks' };
        } else {
          // Try to validate the URL
          try {
            new URL(config.endpoint);
          } catch (e) {
            extraValidation = { valid: false, message: 'Endpoint is not a valid URL' };
          }
        }
        break;
        
      case 'PROCESS':
        if (!config.processKeyword && !config.port) {
          extraValidation = { valid: false, message: 'Process keyword or port is required for PROCESS type health checks' };
        }
        break;
        
      case 'SERVICE':
        if (!config.customCommand) {
          extraValidation = { valid: false, message: 'Custom command is required for SERVICE type health checks' };
        }
        break;
        
      case 'SERVER':
        // No extra validation needed
        break;

       case 'LOG':
          if (!config.logFilePath) {
            extraValidation = { valid: false, message: 'Log file path is required for LOG type health checks' };
          }
          break;  
      default:
        extraValidation = { valid: false, message: `Invalid health check type: ${config.type}` };
    }
    
    // If restart command is provided, check that it's not empty
    if (config.restartCommand !== undefined && config.restartCommand.trim() === '') {
      extraValidation = { valid: false, message: 'Restart command cannot be empty if provided' };
    }
    
    if (!extraValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: [{ msg: extraValidation.message, param: 'type-specific' }]
        }
      });
    }
    
    // If we get here, validation passed
    return res.status(200).json({
      success: true,
      data: {
        message: 'Configuration is valid',
        config
      }
    });
  } catch (error) {
    logger.error({
      msg: 'Error validating health check configuration',
      error: error instanceof Error ? error.message : String(error),
      data: req.body
    });
    
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to validate configuration'
      }
    });
  }
}
// In HealthCheckController class
async getLogHealthChecks(req: Request, res: Response): Promise<Response> {
  try {
    const healthChecks = await healthCheckRepository.findAll({ type: 'LOG' });
    return res.status(200).json({
      success: true,
      data: healthChecks
    });
  } catch (error) {
    logger.error({
      msg: 'Error getting log health checks',
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve log health checks'
      }
    });
  }
}
}

// Export controller instance
export const healthCheckController = new HealthCheckController();