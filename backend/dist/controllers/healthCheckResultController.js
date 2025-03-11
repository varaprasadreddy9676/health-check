"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckResultController = void 0;
const express_validator_1 = require("express-validator");
const logger_1 = __importDefault(require("../utils/logger"));
const factory_1 = require("../repositories/factory");
exports.healthCheckResultController = {
    // Validation rules for getting results
    validateGetResults: [
        (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        (0, express_validator_1.query)('status').optional().isIn(['Healthy', 'Unhealthy']).withMessage('Status must be either Healthy or Unhealthy'),
        (0, express_validator_1.query)('from').optional().isISO8601().withMessage('From date must be in ISO format'),
        (0, express_validator_1.query)('to').optional().isISO8601().withMessage('To date must be in ISO format'),
    ],
    // Get latest results for all health checks
    getLatest: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
            const latestResults = await healthCheckRepository.getLatestResults();
            return res.status(200).json({
                success: true,
                data: latestResults,
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching latest health check results',
                error: error instanceof Error ? error.message : String(error),
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while fetching health check results',
                },
            });
        }
    },
    // Get historical results for a specific health check
    getHistoricalByCheckId: async (req, res) => {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
            const { id } = req.params;
            const { page = 1, limit = 20 } = req.query;
            // Validate health check exists
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
            // Get results with pagination
            const { results, total } = await healthCheckRepository.getResultsByCheckId(id, Number(page), Number(limit));
            return res.status(200).json({
                success: true,
                data: results,
                pagination: {
                    total,
                    page: Number(page),
                    pageSize: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching historical health check results',
                error: error instanceof Error ? error.message : String(error),
                healthCheckId: req.params.id,
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while fetching historical health check results',
                },
            });
        }
    },
    // Get all health check results with filtering and pagination
    getAll: async (req, res) => {
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
            // This would need to be implemented in your repository
            // For now, we'll return an error indicating it's not implemented
            return res.status(501).json({
                success: false,
                error: {
                    code: 'NOT_IMPLEMENTED',
                    message: 'This endpoint is not yet implemented with the repository pattern',
                },
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching health check results',
                error: error instanceof Error ? error.message : String(error),
                query: req.query,
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while fetching health check results',
                },
            });
        }
    },
    // Get health check metrics
    getMetrics: async (req, res) => {
        try {
            // This would need to be implemented in your repository
            // For now, we'll return some mockup data
            return res.status(200).json({
                success: true,
                data: {
                    uptime24h: 98.5,
                    incidentCount: 2,
                    checksByType: {
                        API: 3,
                        PROCESS: 2,
                        SERVICE: 1,
                        SERVER: 1
                    },
                    totalChecks: 50,
                    healthyChecks: 48,
                },
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching health check metrics',
                error: error instanceof Error ? error.message : String(error),
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while fetching health check metrics',
                },
            });
        }
    },
};
//# sourceMappingURL=healthCheckResultController.js.map