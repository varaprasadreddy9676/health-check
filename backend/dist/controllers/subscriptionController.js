"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionController = void 0;
const express_validator_1 = require("express-validator");
const logger_1 = __importDefault(require("../utils/logger"));
const notificationService_1 = require("../services/notificationService");
const factory_1 = require("../repositories/factory");
exports.subscriptionController = {
    // Validation rules
    validateSubscription: [
        (0, express_validator_1.body)('email').isEmail().withMessage('A valid email address is required'),
        (0, express_validator_1.body)('healthCheckId').optional().isUUID().withMessage('Health check ID must be a valid UUID'),
        (0, express_validator_1.body)('severity').optional().isIn(['all', 'high', 'critical']).withMessage('Severity must be one of: all, high, critical'),
    ],
    // Create a new subscription
    create: async (req, res) => {
        try {
            // Validate request
            const errors = (0, express_validator_1.validationResult)(req);
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
                const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
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
            const subscription = await notificationService_1.notificationService.createSubscription({
                email,
                healthCheckId,
                severity: severity,
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
        }
        catch (error) {
            logger_1.default.error({
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
    verify: async (req, res) => {
        try {
            const { token } = req.params;
            // Verify subscription
            const subscription = await notificationService_1.notificationService.verifySubscription(token);
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
        }
        catch (error) {
            logger_1.default.error({
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
    unsubscribe: async (req, res) => {
        try {
            const { token } = req.params;
            // Unsubscribe
            const subscription = await notificationService_1.notificationService.unsubscribe(token);
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
        }
        catch (error) {
            logger_1.default.error({
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
    getByEmail: async (req, res) => {
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
            const subscriptions = await notificationService_1.notificationService.getSubscriptionsByEmail(email);
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
        }
        catch (error) {
            logger_1.default.error({
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
    update: async (req, res) => {
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
            const updatedSubscription = await notificationService_1.notificationService.updateSubscription(id, {
                active: typeof active === 'boolean' ? active : undefined,
                severity: severity,
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
        }
        catch (error) {
            logger_1.default.error({
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
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            // Delete subscription
            const success = await notificationService_1.notificationService.deleteSubscription(id);
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
        }
        catch (error) {
            logger_1.default.error({
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
    getHealthChecks: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
            // Get all health checks
            const healthChecks = await healthCheckRepository.findAll();
            // Format for subscription options
            const options = healthChecks.map(check => ({
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
        }
        catch (error) {
            logger_1.default.error({
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
//# sourceMappingURL=subscriptionController.js.map