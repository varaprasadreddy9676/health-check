import { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { notificationRepository } from '../repositories/notificationRepository';
import { notificationService } from '../services/notificationService';
import { healthCheckRepository } from '../repositories/healthCheckRepository';
import logger from '../utils/logger';

// Notification Controller
export class NotificationController {
  /**
   * Validation rules for email settings
   */
  validateEmailSettings = [
    body('recipients').isArray().withMessage('Recipients must be an array'),
    body('recipients.*').isEmail().withMessage('Recipients must be valid email addresses'),
    body('throttleMinutes').optional().isInt({ min: 1 }).withMessage('Throttle minutes must be a positive integer'),
    body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
  ];
  
  /**
   * Validation rules for subscription
   */
  validateSubscription = [
    body('email').isEmail().withMessage('A valid email address is required'),
    body('healthCheckId').optional().isMongoId().withMessage('Health check ID must be valid'),
    body('severity').optional().isIn(['all', 'high', 'critical']).withMessage('Severity must be one of: all, high, critical'),
  ];
  
  /**
   * Get notification history
   */
  async getHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { page = 1, limit = 20, type } = req.query;
      
      const { notifications, total } = await notificationRepository.getNotificationHistory(
        Number(page),
        Number(limit),
        type as any
      );
      
      return res.status(200).json({
        success: true,
        data: notifications,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting notification history',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve notification history'
        }
      });
    }
  }
  
  /**
   * Get email settings
   */
  async getEmailSettings(req: Request, res: Response): Promise<Response> {
    try {
      const emailConfig = await notificationRepository.getEmailConfig();
      
      return res.status(200).json({
        success: true,
        data: {
          recipients: emailConfig.recipients,
          throttleMinutes: emailConfig.throttleMinutes,
          enabled: emailConfig.enabled,
          lastSentAt: emailConfig.lastSentAt
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting email settings',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve email settings'
        }
      });
    }
  }
  
  /**
   * Update email settings
   */
  async updateEmailSettings(req: Request, res: Response): Promise<Response> {
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
      
      const { recipients, throttleMinutes, enabled } = req.body;
      
      const updatedConfig = await notificationRepository.updateEmailConfig({
        recipients,
        throttleMinutes,
        enabled
      });
      
      return res.status(200).json({
        success: true,
        data: {
          recipients: updatedConfig.recipients,
          throttleMinutes: updatedConfig.throttleMinutes,
          enabled: updatedConfig.enabled,
          lastSentAt: updatedConfig.lastSentAt
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error updating email settings',
        error: error instanceof Error ? error.message : String(error),
        data: req.body
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update email settings'
        }
      });
    }
  }
  
  /**
   * Create subscription
   */
  async createSubscription(req: Request, res: Response): Promise<Response> {
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
      
      const { email, healthCheckId, severity } = req.body;
      
      // Validate health check if provided
      if (healthCheckId) {
        const healthCheck = await healthCheckRepository.findById(healthCheckId);
        
        if (!healthCheck) {
          return res.status(404).json({
            success: false,
            error: {
              message: `Health check with ID ${healthCheckId} not found`
            }
          });
        }
        
        const subscription = await notificationService.createSubscription({
          email,
          healthCheckId,
          healthCheckName: healthCheck.name,
          severity
        });
        
        return res.status(201).json({
          success: true,
          data: subscription
        });
      } else {
        // Global subscription (all health checks)
        const subscription = await notificationService.createSubscription({
          email,
          severity
        });
        
        return res.status(201).json({
          success: true,
          data: subscription
        });
      }
    } catch (error) {
      logger.error({
        msg: 'Error creating subscription',
        error: error instanceof Error ? error.message : String(error),
        data: req.body
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create subscription'
        }
      });
    }
  }
  
  /**
   * Verify subscription
   */
  async verifySubscription(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.params;
      
      const subscription = await notificationService.verifySubscription(token);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Invalid or expired verification token'
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          message: 'Subscription verified successfully',
          subscription
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error verifying subscription',
        error: error instanceof Error ? error.message : String(error),
        token: req.params.token
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to verify subscription'
        }
      });
    }
  }
  
  /**
   * Unsubscribe
   */
  async unsubscribe(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.params;
      
      const subscription = await notificationService.unsubscribe(token);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Invalid unsubscribe token'
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          message: 'Successfully unsubscribed',
          subscription
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error unsubscribing',
        error: error instanceof Error ? error.message : String(error),
        token: req.params.token
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to process unsubscribe request'
        }
      });
    }
  }
  
  /**
   * Get subscriptions by email
   */
  async getSubscriptionsByEmail(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.params;
      
      // Basic email validation
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid email address'
          }
        });
      }
      
      const subscriptions = await notificationService.getSubscriptionsByEmail(email);
      
      return res.status(200).json({
        success: true,
        data: {
          email,
          subscriptions
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting subscriptions by email',
        error: error instanceof Error ? error.message : String(error),
        email: req.params.email
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve subscriptions'
        }
      });
    }
  }
  
  /**
   * Update subscription
   */
  async updateSubscription(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { active, severity } = req.body;
      
      // Ensure at least one field is provided
      if (active === undefined && severity === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'At least one of active or severity must be provided'
          }
        });
      }
      
      // Validate severity if provided
      if (severity !== undefined && !['all', 'high', 'critical'].includes(severity)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Severity must be one of: all, high, critical'
          }
        });
      }
      
      const subscription = await notificationService.updateSubscription(id, {
        active: typeof active === 'boolean' ? active : undefined,
        severity: severity as any
      });
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Subscription with ID ${id} not found`
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      logger.error({
        msg: 'Error updating subscription',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
        data: req.body
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update subscription'
        }
      });
    }
  }
  
  /**
   * Delete subscription
   */
  async deleteSubscription(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const success = await notificationService.deleteSubscription(id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Subscription with ID ${id} not found`
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          message: 'Subscription deleted successfully'
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error deleting subscription',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete subscription'
        }
      });
    }
  }
  
  /**
   * Get health checks for subscription UI
   */
  async getHealthChecksForSubscription(req: Request, res: Response): Promise<Response> {
    try {
      const healthChecks = await healthCheckRepository.findAll();
      
      const options = [
        {
          id: null,
          name: 'All Health Checks',
          type: 'GLOBAL'
        },
        ...healthChecks.map(check => ({
          id: check.id,
          name: check.name,
          type: check.type
        }))
      ];
      
      return res.status(200).json({
        success: true,
        data: options
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting health checks for subscription',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve health check options'
        }
      });
    }
  }
}

// Export controller instance
export const notificationController = new NotificationController();