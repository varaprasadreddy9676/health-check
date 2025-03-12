import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';

// Create router
const router = Router();

// Notification Routes
router.get('/', notificationController.getHistory);

// Email Settings Routes
router.get('/settings/email', notificationController.getEmailSettings);
router.put('/settings/email', notificationController.validateEmailSettings, notificationController.updateEmailSettings);

// Subscription Routes
router.get('/subscriptions/health-checks', notificationController.getHealthChecksForSubscription);
router.post('/subscriptions', notificationController.validateSubscription, notificationController.createSubscription);
router.get('/subscriptions/email/:email', notificationController.getSubscriptionsByEmail);
router.put('/subscriptions/:id', notificationController.updateSubscription);
router.delete('/subscriptions/:id', notificationController.deleteSubscription);
router.get('/subscriptions/verify/:token', notificationController.verifySubscription);
router.get('/subscriptions/unsubscribe/:token', notificationController.unsubscribe);

export default router;