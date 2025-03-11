"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incidentController_1 = require("../controllers/incidentController");
const router = (0, express_1.Router)();
// GET /api/incidents - Get all incidents
router.get('/', incidentController_1.incidentController.getAll);
// GET /api/incidents/active - Get active incidents
router.get('/active', incidentController_1.incidentController.getActive);
// GET /api/incidents/metrics - Get incident metrics
router.get('/metrics', incidentController_1.incidentController.getMetrics);
// GET /api/incidents/:id - Get an incident by ID
router.get('/:id', incidentController_1.incidentController.getById);
// PUT /api/incidents/:id - Update an incident
router.put('/:id', incidentController_1.incidentController.validateIncident, incidentController_1.incidentController.update);
// POST /api/incidents/:id/events - Add an event to an incident
router.post('/:id/events', incidentController_1.incidentController.addEvent);
// POST /api/incidents/:id/resolve - Resolve an incident
router.post('/:id/resolve', incidentController_1.incidentController.resolve);
exports.default = router;
//# sourceMappingURL=incidentRoutes.js.map