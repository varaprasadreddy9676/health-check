"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthCheckResultController_1 = require("../controllers/healthCheckResultController");
const router = (0, express_1.Router)();
// GET /api/results/latest - Get latest results for all health checks
router.get('/latest', healthCheckResultController_1.healthCheckResultController.getLatest);
// GET /api/results/:id - Get historical results for a specific health check
router.get('/:id', healthCheckResultController_1.healthCheckResultController.getHistoricalByCheckId);
// GET /api/results - Get all health check results with filtering
router.get('/', healthCheckResultController_1.healthCheckResultController.validateGetResults, healthCheckResultController_1.healthCheckResultController.getAll);
// GET /api/results/metrics - Get aggregated metrics
router.get('/metrics', healthCheckResultController_1.healthCheckResultController.getMetrics);
exports.default = router;
//# sourceMappingURL=healthCheckResultRoutes.js.map