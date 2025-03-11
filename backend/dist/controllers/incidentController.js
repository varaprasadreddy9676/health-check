"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentController = void 0;
const express_validator_1 = require("express-validator");
const logger_1 = __importDefault(require("../utils/logger"));
const factory_1 = require("../repositories/factory");
exports.incidentController = {
    // Validation rules for incident operations
    validateIncident: [
        (0, express_validator_1.body)('status').optional().isIn(['investigating', 'identified', 'monitoring', 'resolved']).withMessage('Status must be one of: investigating, identified, monitoring, resolved'),
        (0, express_validator_1.body)('severity').optional().isIn(['critical', 'high', 'medium', 'low']).withMessage('Severity must be one of: critical, high, medium, low'),
        (0, express_validator_1.body)('title').optional().notEmpty().withMessage('Title cannot be empty'),
        (0, express_validator_1.body)('details').optional(),
    ],
    // Get all incidents with pagination
    getAll: async (req, res) => {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            const { page = 1, limit = 10, status } = req.query;
            const result = await incidentRepository.findAll(Number(page), Number(limit), status);
            return res.status(200).json({
                success: true,
                data: result.incidents,
                pagination: {
                    total: result.total,
                    page: Number(page),
                    pageSize: Number(limit),
                    totalPages: Math.ceil(result.total / Number(limit)),
                },
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching incidents',
                error: error instanceof Error ? error.message : String(error),
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while fetching incidents',
                },
            });
        }
    },
    // Get active incidents
    getActive: async (req, res) => {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            const incidents = await incidentRepository.findActive();
            return res.status(200).json({
                success: true,
                data: incidents,
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching active incidents',
                error: error instanceof Error ? error.message : String(error),
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while fetching active incidents',
                },
            });
        }
    },
    // Get a single incident by ID
    getById: async (req, res) => {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            const { id } = req.params;
            const incident = await incidentRepository.findById(id);
            if (!incident) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: `Incident with ID ${id} not found`,
                    },
                });
            }
            // Get incident events
            const events = await incidentRepository.getEvents(id);
            return res.status(200).json({
                success: true,
                data: {
                    incident,
                    events,
                },
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching incident',
                error: error instanceof Error ? error.message : String(error),
                id: req.params.id,
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while fetching the incident',
                },
            });
        }
    },
    // Update an incident
    update: async (req, res) => {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
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
            // Check if incident exists
            const incident = await incidentRepository.findById(id);
            if (!incident) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: `Incident with ID ${id} not found`,
                    },
                });
            }
            // Prepare update data
            const updateData = {
                ...req.body,
                updatedAt: new Date(),
                // If status is being changed to resolved, set resolvedAt
                ...(req.body.status === 'resolved' && { resolvedAt: new Date() }),
            };
            // Update incident
            const updatedIncident = await incidentRepository.update(id, updateData);
            // Add an event for the update
            const changeDescription = Object.entries(req.body)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            await incidentRepository.addEvent({
                incidentId: id,
                message: `Incident updated: ${changeDescription}`,
                createdAt: new Date()
            });
            return res.status(200).json({
                success: true,
                data: updatedIncident,
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error updating incident',
                error: error instanceof Error ? error.message : String(error),
                id: req.params.id,
                data: req.body,
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while updating the incident',
                },
            });
        }
    },
    // Add event to an incident
    addEvent: async (req, res) => {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            const { id } = req.params;
            const { message } = req.body;
            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Message is required',
                    },
                });
            }
            // Check if incident exists
            const incident = await incidentRepository.findById(id);
            if (!incident) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: `Incident with ID ${id} not found`,
                    },
                });
            }
            // Add the event
            const event = await incidentRepository.addEvent({
                incidentId: id,
                message,
                createdAt: new Date()
            });
            return res.status(201).json({
                success: true,
                data: event,
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error adding incident event',
                error: error instanceof Error ? error.message : String(error),
                id: req.params.id,
                message: req.body.message,
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while adding the incident event',
                },
            });
        }
    },
    // Resolve an incident
    resolve: async (req, res) => {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            const { id } = req.params;
            const { message } = req.body;
            // Check if incident exists
            const incident = await incidentRepository.findById(id);
            if (!incident) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: `Incident with ID ${id} not found`,
                    },
                });
            }
            // Update incident status
            const resolvedIncident = await incidentRepository.update(id, {
                status: 'resolved',
                resolvedAt: new Date(),
                updatedAt: new Date()
            });
            // Add resolution event
            await incidentRepository.addEvent({
                incidentId: id,
                message: message || 'Incident resolved',
                createdAt: new Date()
            });
            return res.status(200).json({
                success: true,
                data: resolvedIncident,
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error resolving incident',
                error: error instanceof Error ? error.message : String(error),
                id: req.params.id,
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while resolving the incident',
                },
            });
        }
    },
    // Get incident metrics
    getMetrics: async (req, res) => {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            const metrics = await incidentRepository.getMetrics();
            return res.status(200).json({
                success: true,
                data: metrics,
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching incident metrics',
                error: error instanceof Error ? error.message : String(error),
            });
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while fetching incident metrics',
                },
            });
        }
    },
};
//# sourceMappingURL=incidentController.js.map