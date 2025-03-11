import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import logger from '../utils/logger';
import { notificationService } from '../services/notificationService';
import { getHealthCheckRepository } from '../repositories/factory';
import { getNotificationRepository } from '../repositories/factory';

// Assuming HealthCheckOption is the type used for options
interface HealthCheckOption {
  id: string | null;
  name: string;
  type: string;
}

export const subscriptionController = {
  // Validation rules
  validateSubscription: [
    body('email').isEmail().withMessage('A valid email address is required'),
    body('healthCheckId').optional().isUUID().withMessage('Health check ID must be a valid UUID'),
    body('severity').optional().isIn(['all', 'high', 'critical']).withMessage('Severity must be one of: all, high, critical'),
  ],
  
  // Create a new subscription
  create: async (req: Request, res: Response) => {
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
      
      const { email, healthCheckId, severity } = req.body;
      
      // Validate health check ID if provided
      if (healthCheckId) {
        const healthCheckRepository = getHealthCheckRepository();
        const healthCheck = await healthCheckRepository.findById(healthCheckId);
        if (!healthCheck) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Health check with ID ${healthCheckId} not found`,
            },
          });
        }
      }
      
      // Create subscription
      const subscription = await notificationService.createSubscription({
        email,
        healthCheckId,
        severity: severity as 'all' | 'high' | 'critical',
      });
      
      // Return success response
      return res.status(201).json({
        success: true,
        data: {
          message: 'Subscription created. Please check your email for verification instructions.',
          email: subscription.email,
          verified: !!subscription.verifiedAt,
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error creating subscription',
        error: error instanceof Error ? error.message : String(error),
        data: req.body,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while creating the subscription',
        },
      });
    }
  },
  
  // Verify a subscription
  verify: async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Verify subscription
      const subscription = await notificationService.verifySubscription(token);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired verification token',
          },
        });
      }
      
      // If verification was successful, redirect to a success page or return JSON
      // For API-only use case, return JSON
      return res.status(200).json({
        success: true,
        data: {
          message: 'Subscription verified successfully',
          email: subscription.email,
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error verifying subscription',
        error: error instanceof Error ? error.message : String(error),
        token: req.params.token,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while verifying the subscription',
        },
      });
    }
  },
  
  // Unsubscribe
  unsubscribe: async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Unsubscribe
      const subscription = await notificationService.unsubscribe(token);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid unsubscribe token',
          },
        });
      }
      
      // Return success
      return res.status(200).json({
        success: true,
        data: {
          message: 'Successfully unsubscribed from notifications',
          email: subscription.email,
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error unsubscribing',
        error: error instanceof Error ? error.message : String(error),
        token: req.params.token,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while processing the unsubscribe request',
        },
      });
    }
  },
  
  // Get all subscriptions for an email
  getByEmail: async (req: Request, res: Response) => {
    try {
      // Validate email
      const { email } = req.params;
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email address',
          },
        });
      }
      
      // Get subscriptions
      const subscriptions = await notificationService.getSubscriptionsByEmail(email);
      
      // Format response
      const formattedSubscriptions = subscriptions.map(sub => ({
        id: sub.id,
        healthCheckId: sub.healthCheckId,
        healthCheckName: sub.healthCheck?.name || 'All health checks',
        severity: sub.severity,
        active: sub.active,
        verified: !!sub.verifiedAt,
      }));
      
      return res.status(200).json({
        success: true,
        data: {
          email,
          subscriptions: formattedSubscriptions,
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting subscriptions by email',
        error: error instanceof Error ? error.message : String(error),
        email: req.params.email,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching subscriptions',
        },
      });
    }
  },
  
  // Update a subscription
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { active, severity } = req.body;
      
      // Validate request
      if (active === undefined && severity === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one of active or severity must be provided',
          },
        });
      }
      
      if (severity && !['all', 'high', 'critical'].includes(severity)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Severity must be one of: all, high, critical',
          },
        });
      }
      
      // Update subscription
      const updatedSubscription = await notificationService.updateSubscription(id, {
        active: typeof active === 'boolean' ? active : undefined,
        severity: severity as 'all' | 'high' | 'critical' | undefined,
      });
      
      // Return success
      return res.status(200).json({
        success: true,
        data: {
          id: updatedSubscription.id,
          email: updatedSubscription.email,
          healthCheckId: updatedSubscription.healthCheckId,
          healthCheckName: updatedSubscription.healthCheck?.name || 'All health checks',
          severity: updatedSubscription.severity,
          active: updatedSubscription.active,
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error updating subscription',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
        data: req.body,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while updating the subscription',
        },
      });
    }
  },
  
  // Delete a subscription
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Delete subscription
      const success = await notificationService.deleteSubscription(id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Subscription with ID ${id} not found`,
          },
        });
      }
      
      // Return success
      return res.status(200).json({
        success: true,
        data: {
          message: 'Subscription deleted successfully',
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error deleting subscription',
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while deleting the subscription',
        },
      });
    }
  },
  
  // Get all available health checks for subscription options
  getHealthChecks: async (req: Request, res: Response) => {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      
      // Get all health checks
      const healthChecks = await healthCheckRepository.findAll();
      
      // Format for subscription options
      const options: HealthCheckOption[] = healthChecks.map(check => ({
        id: check.id,
        name: check.name,
        type: check.type,
      }));
      
      // Add "All health checks" option
      options.unshift({
        id: null,
        name: 'All health checks',
        type: 'GLOBAL',
      });
      
      return res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting health check options',
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching health check options',
        },
      });
    }
  },
};