import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import logger from '../utils/logger';
import { getNotificationRepository } from '../repositories/factory';

export const notificationController = {
  // Validation rules for notification settings
  validateEmailSettings: [
    body('recipients').isArray().withMessage('Recipients must be an array'),
    body('recipients.*').isEmail().withMessage('Recipients must be valid email addresses'),
    body('throttleMinutes').optional().isInt({ min: 1 }).withMessage('Throttle minutes must be a positive integer'),
    body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
  ],

  validateSlackSettings: [
    body('webhookUrl').isURL().withMessage('Webhook URL must be a valid URL'),
    body('channel').optional(),
    body('throttleMinutes').optional().isInt({ min: 1 }).withMessage('Throttle minutes must be a positive integer'),
    body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
  ],

  // Get notification history
  getHistory: async (req: Request, res: Response) => {
    try {
      const notificationRepository = getNotificationRepository();
      const { page = 1, limit = 20, type } = req.query;
      
      const { notifications, total } = await notificationRepository.findAll(
        Number(page), 
        Number(limit), 
        type as string | undefined
      );
      
      return res.status(200).json({
        success: true,
        data: notifications,
        pagination: {
          total,
          page: Number(page),
          pageSize: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error fetching notification history',
        error: error instanceof Error ? error.message : String(error),
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching notification history',
        },
      });
    }
  },

  // Get email notification settings
  getEmailSettings: async (req: Request, res: Response) => {
    try {
      const notificationRepository = getNotificationRepository();
      const settings = await notificationRepository.getEmailConfig();
      
      return res.status(200).json({
        success: true,
        data: settings || {
          recipients: [],
          throttleMinutes: 60,
          enabled: false,
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error fetching email settings',
        error: error instanceof Error ? error.message : String(error),
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching email settings',
        },
      });
    }
  },

  // Update email notification settings
  updateEmailSettings: async (req: Request, res: Response) => {
    try {
      const notificationRepository = getNotificationRepository();
      
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
      
      const { recipients, throttleMinutes, enabled } = req.body;
      
      // Update settings
      const settings = await notificationRepository.updateEmailConfig({
        recipients,
        throttleMinutes: throttleMinutes || 60,
        enabled,
        updatedAt: new Date()
      });
      
      return res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error({
        msg: 'Error updating email settings',
        error: error instanceof Error ? error.message : String(error),
        data: req.body,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while updating email settings',
        },
      });
    }
  },

  // Get Slack notification settings
  getSlackSettings: async (req: Request, res: Response) => {
    try {
      const notificationRepository = getNotificationRepository();
      const settings = await notificationRepository.getSlackConfig();
      
      return res.status(200).json({
        success: true,
        data: settings || {
          webhookUrl: '',
          channel: '',
          throttleMinutes: 60,
          enabled: false,
        },
      });
    } catch (error) {
      logger.error({
        msg: 'Error fetching Slack settings',
        error: error instanceof Error ? error.message : String(error),
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching Slack settings',
        },
      });
    }
  },

  // Update Slack notification settings
  updateSlackSettings: async (req: Request, res: Response) => {
    try {
      const notificationRepository = getNotificationRepository();
      
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
      
      const { webhookUrl, channel, throttleMinutes, enabled } = req.body;
      
      // Update settings
      const settings = await notificationRepository.updateSlackConfig({
        webhookUrl,
        channel,
        throttleMinutes: throttleMinutes || 60,
        enabled,
        updatedAt: new Date()
      });
      
      return res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error({
        msg: 'Error updating Slack settings',
        error: error instanceof Error ? error.message : String(error),
        data: req.body,
      });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while updating Slack settings',
        },
      });
    }
  },
};