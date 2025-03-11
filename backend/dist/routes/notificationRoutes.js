"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const subscriptionController_1 = require("../controllers/subscriptionController");
const router = (0, express_1.Router)();
// Existing notification routes
// GET /api/notifications - Get notification history
router.get('/', notificationController_1.notificationController.getHistory);
// GET /api/notifications/settings/email - Get email notification settings
router.get('/settings/email', notificationController_1.notificationController.getEmailSettings);
// PUT /api/notifications/settings/email - Update email notification settings
router.put('/settings/email', notificationController_1.notificationController.validateEmailSettings, notificationController_1.notificationController.updateEmailSettings);
// GET /api/notifications/settings/slack - Get Slack notification settings
router.get('/settings/slack', notificationController_1.notificationController.getSlackSettings);
// PUT /api/notifications/settings/slack - Update Slack notification settings
router.put('/settings/slack', notificationController_1.notificationController.validateSlackSettings, notificationController_1.notificationController.updateSlackSettings);
// New subscription routes
// GET /api/notifications/subscriptions/health-checks - Get available health checks for subscriptions
router.get('/subscriptions/health-checks', subscriptionController_1.subscriptionController.getHealthChecks);
// POST /api/notifications/subscriptions - Create a new subscription
router.post('/subscriptions', subscriptionController_1.subscriptionController.validateSubscription, subscriptionController_1.subscriptionController.create);
// GET /api/notifications/subscriptions/email/:email - Get all subscriptions for an email
router.get('/subscriptions/email/:email', subscriptionController_1.subscriptionController.getByEmail);
// PUT /api/notifications/subscriptions/:id - Update a subscription
router.put('/subscriptions/:id', subscriptionController_1.subscriptionController.update);
// DELETE /api/notifications/subscriptions/:id - Delete a subscription
router.delete('/subscriptions/:id', subscriptionController_1.subscriptionController.delete);
// GET /api/notifications/subscriptions/verify/:token - Verify a subscription
router.get('/subscriptions/verify/:token', subscriptionController_1.subscriptionController.verify);
// GET /api/notifications/subscriptions/unsubscribe/:token - Unsubscribe
router.get('/subscriptions/unsubscribe/:token', subscriptionController_1.subscriptionController.unsubscribe);
exports.default = router;
//# sourceMappingURL=notificationRoutes.js.map