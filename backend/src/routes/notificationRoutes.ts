import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';

const router = Router();

// GET /api/notifications - Get notification history
router.get('/', notificationController.getHistory);

// GET /api/notifications/settings/email - Get email notification settings
router.get('/settings/email', notificationController.getEmailSettings);

// PUT /api/notifications/settings/email - Update email notification settings
router.put('/settings/email', notificationController.validateEmailSettings, notificationController.updateEmailSettings);

// GET /api/notifications/settings/slack - Get Slack notification settings
router.get('/settings/slack', notificationController.getSlackSettings);

// PUT /api/notifications/settings/slack - Update Slack notification settings
router.put('/settings/slack', notificationController.validateSlackSettings, notificationController.updateSlackSettings);

export default router;