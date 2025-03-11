"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthCheckController_1 = require("../controllers/healthCheckController");
const router = (0, express_1.Router)();
// GET /api/healthchecks - Get all health checks
router.get('/', healthCheckController_1.healthCheckController.getAll);
// POST /api/healthchecks - Create a new health check
router.post('/', healthCheckController_1.healthCheckController.validateHealthCheck, healthCheckController_1.healthCheckController.create);
// GET /api/healthchecks/:id - Get a health check by ID
router.get('/:id', healthCheckController_1.healthCheckController.getById);
// PUT /api/healthchecks/:id - Update a health check
router.put('/:id', healthCheckController_1.healthCheckController.validateHealthCheck, healthCheckController_1.healthCheckController.update);
// DELETE /api/healthchecks/:id - Delete a health check
router.delete('/:id', healthCheckController_1.healthCheckController.delete);
// PATCH /api/healthchecks/:id/toggle - Toggle a health check (enable/disable)
router.patch('/:id/toggle', healthCheckController_1.healthCheckController.toggle);
exports.default = router;
//# sourceMappingURL=healthCheckRoutes.js.map