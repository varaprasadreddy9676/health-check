"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckController = void 0;
const express_validator_1 = require("express-validator");
const logger_1 = __importDefault(require("../utils/logger"));
const healthCheckService_1 = require("../services/healthCheckService");
const factory_1 = require("../repositories/factory");
// Controller for health check operations
exports.healthCheckController = {
    // Validation rules for health check creation/update
    validateHealthCheck: [
        (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
        (0, express_validator_1.body)('type').isIn(['API', 'PROCESS', 'SERVICE', 'SERVER']).withMessage('Type must be one of: API, PROCESS, SERVICE, SERVER'),
        (0, express_validator_1.body)('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
        (0, express_validator_1.body)('checkInterval').optional().isInt({ min: 10 }).withMessage('Check interval must be at least 10 seconds'),
        (0, express_validator_1.body)('endpoint').if((0, express_validator_1.body)('type').equals('API')).notEmpty().withMessage('Endpoint is required for API checks'),
        (0, express_validator_1.body)('processKeyword').if((0, express_validator_1.body)('type').equals('PROCESS')).notEmpty().withMessage('Process keyword is required for PROCESS checks'),
        (0, express_validator_1.body)('customCommand').if((0, express_validator_1.body)('type').equals('SERVICE')).notEmpty().withMessage('Custom command is required for SERVICE checks'),
        (0, express_validator_1.body)('expectedOutput').if((0, express_validator_1.body)('type').equals('SERVICE')).optional(),
        (0, express_validator_1.body)('port').if((0, express_validator_1.body)('type').equals('PROCESS')).optional().isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535'),
        (0, express_validator_1.body)('timeout').optional().isInt({ min: 1000 }).withMessage('Timeout must be at least 1000ms'),
        (0, express_validator_1.body)('restartCommand').optional(),
        (0, express_validator_1.body)('notifyOnFailure').optional().isBoolean().withMessage('NotifyOnFailure must be a boolean'),
    ],
    // Get all health checks
    getAll: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
            const { type, status } = req.query;
            // Build filter options
            const filter = {};
            if (type) {
                filter.type = type;
            }
            if (status === 'active') {
                filter.enabled = true;
            }
            else if (status === 'inactive') {
                filter.enabled = false;
            }
            // Get health checks
            const healthChecks = await healthCheckRepository.findAll(filter);
            // Return success response
            return res.status(200).json({
                success: true,
                data: healthChecks,
            });
        }
        catch (error) {
            logger_1.default.error({
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
    getById: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
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
        }
        catch (error) {
            logger_1.default.error({
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
    create: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
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
        }
        catch (error) {
            logger_1.default.error({
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
    update: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
            const { id } = req.params;
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
        }
        catch (error) {
            logger_1.default.error({
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
    delete: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
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
        }
        catch (error) {
            logger_1.default.error({
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
    toggle: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
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
        }
        catch (error) {
            logger_1.default.error({
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
    forceCheck: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
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
            const result = await healthCheckService_1.healthCheckService.forceHealthCheck(id);
            // Return success response
            return res.status(200).json({
                success: true,
                data: {
                    isHealthy: result.isHealthy,
                    details: result.details,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            logger_1.default.error({
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
    restart: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
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
            const result = await healthCheckService_1.healthCheckService.restartService(id);
            // Return success response
            return res.status(200).json({
                success: result.success,
                data: {
                    details: result.details,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            logger_1.default.error({
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
//# sourceMappingURL=healthCheckController.js.map