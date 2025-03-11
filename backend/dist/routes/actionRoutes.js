"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthCheckController_1 = require("../controllers/healthCheckController");
const router = (0, express_1.Router)();
// POST /api/actions/:id/restart - Restart a service
router.post('/:id/restart', healthCheckController_1.healthCheckController.restart);
// POST /api/actions/:id/force-check - Force a health check
router.post('/:id/force-check', healthCheckController_1.healthCheckController.forceCheck);
exports.default = router;
//# sourceMappingURL=actionRoutes.js.map