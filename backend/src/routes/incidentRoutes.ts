import { Router } from 'express';
import { incidentController } from '../controllers/incidentController';

const router = Router();

// GET /api/incidents - Get all incidents
router.get('/', incidentController.getAll);

// GET /api/incidents/active - Get active incidents
router.get('/active', incidentController.getActive);

// GET /api/incidents/metrics - Get incident metrics
router.get('/metrics', incidentController.getMetrics);

// GET /api/incidents/:id - Get an incident by ID
router.get('/:id', incidentController.getById);

// PUT /api/incidents/:id - Update an incident
router.put('/:id', incidentController.validateIncident, incidentController.update);

// POST /api/incidents/:id/events - Add an event to an incident
router.post('/:id/events', incidentController.addEvent);

// POST /api/incidents/:id/resolve - Resolve an incident
router.post('/:id/resolve', incidentController.resolve);

export default router;