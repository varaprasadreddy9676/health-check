import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { subscriptionController } from '../controllers/subscriptionController';

const router = Router();

// Existing notification routes
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

// New subscription routes
// GET /api/notifications/subscriptions/health-checks - Get available health checks for subscriptions
router.get('/subscriptions/health-checks', subscriptionController.getHealthChecks);

// POST /api/notifications/subscriptions - Create a new subscription
router.post('/subscriptions', subscriptionController.validateSubscription, subscriptionController.create);

// GET /api/notifications/subscriptions/email/:email - Get all subscriptions for an email
router.get('/subscriptions/email/:email', subscriptionController.getByEmail);

// PUT /api/notifications/subscriptions/:id - Update a subscription
router.put('/subscriptions/:id', subscriptionController.update);

// DELETE /api/notifications/subscriptions/:id - Delete a subscription
router.delete('/subscriptions/:id', subscriptionController.delete);

// GET /api/notifications/subscriptions/verify/:token - Verify a subscription
router.get('/subscriptions/verify/:token', subscriptionController.verify);

// GET /api/notifications/subscriptions/unsubscribe/:token - Unsubscribe
router.get('/subscriptions/unsubscribe/:token', subscriptionController.unsubscribe);

export default router;