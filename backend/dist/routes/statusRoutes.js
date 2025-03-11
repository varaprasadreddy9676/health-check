"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = __importDefault(require("../utils/logger"));
const factory_1 = require("../repositories/factory");
const factory_2 = require("../repositories/factory");
const router = (0, express_1.Router)();
// GET /api/status/summary - Get current system status
router.get('/summary', async (req, res) => {
    try {
        const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
        const incidentRepository = (0, factory_2.getIncidentRepository)();
        // Get active incidents
        const activeIncidents = await incidentRepository.findActive();
        // Get all health checks
        const healthChecks = await healthCheckRepository.findAll({ enabled: true });
        // Get latest results for health checks
        const latestResults = await healthCheckRepository.getLatestResults();
        // Count unhealthy checks
        const unhealthyChecks = latestResults.filter(result => result.status === 'Unhealthy');
        // Determine overall status
        let overallStatus = 'operational';
        if (activeIncidents.length > 0 || unhealthyChecks.length > 0) {
            overallStatus = unhealthyChecks.length > healthChecks.length / 2 ? 'major_outage' : 'partial_outage';
        }
        return res.status(200).json({
            success: true,
            data: {
                status: overallStatus,
                activeIncidents: activeIncidents.length,
                unhealthyChecks: unhealthyChecks.length,
                totalChecks: healthChecks.length,
                lastUpdated: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_1.default.error({
            msg: 'Error getting status summary',
            error: error instanceof Error ? error.message : String(error),
        });
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An error occurred while getting the status summary',
            },
        });
    }
});
// GET /api/status/components - Get component status
router.get('/components', async (req, res) => {
    try {
        const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
        // Get latest results for all health checks
        const latestResults = await healthCheckRepository.getLatestResults();
        // Format the data
        const components = latestResults.map(result => ({
            id: result.healthCheckId,
            name: result.healthCheck?.name || 'Unknown',
            type: result.healthCheck?.type || 'Unknown',
            status: result.status,
            lastChecked: result.createdAt,
        }));
        return res.status(200).json({
            success: true,
            data: components,
        });
    }
    catch (error) {
        logger_1.default.error({
            msg: 'Error getting component status',
            error: error instanceof Error ? error.message : String(error),
        });
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An error occurred while getting component status',
            },
        });
    }
});
// GET /api/status/history - Get status history
router.get('/history', async (req, res) => {
    try {
        const incidentRepository = (0, factory_2.getIncidentRepository)();
        const { days = 7 } = req.query;
        const daysNum = Math.min(Number(days), 30); // Limit to 30 days
        // Fetch incident history from the repository
        const historyData = await incidentRepository.getHistory(daysNum);
        return res.status(200).json({
            success: true,
            data: historyData,
        });
    }
    catch (error) {
        logger_1.default.error({
            msg: 'Error getting status history',
            error: error instanceof Error ? error.message : String(error),
        });
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An error occurred while getting status history',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=statusRoutes.js.map