"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const notificationService_1 = require("./notificationService");
const factory_1 = require("../repositories/factory");
class IncidentService {
    // Get all incidents with pagination
    async getIncidents(page = 1, limit = 10, status) {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            const result = await incidentRepository.findAll(page, limit, status);
            return {
                incidents: result.incidents,
                total: result.total,
                page: page,
                pageSize: limit,
                totalPages: Math.ceil(result.total / limit),
            };
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching incidents',
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    // Get active incidents
    async getActiveIncidents() {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            return incidentRepository.findActive();
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching active incidents',
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    // Get a single incident with its events
    async getIncident(id) {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            const [incident, events] = await Promise.all([
                incidentRepository.findById(id),
                incidentRepository.getEvents(id),
            ]);
            return { incident, events };
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error fetching incident details',
                error: error instanceof Error ? error.message : String(error),
                incidentId: id,
            });
            throw error;
        }
    }
    // Update an incident
    async updateIncident(id, data) {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            const currentIncident = await incidentRepository.findById(id);
            if (!currentIncident) {
                throw new Error(`Incident with ID ${id} not found`);
            }
            // If status is being changed to resolved, set resolvedAt
            const updateData = { ...data };
            if (data.status === 'resolved' && currentIncident.status !== 'resolved') {
                updateData.resolvedAt = new Date();
            }
            // Update the incident
            const updatedIncident = await incidentRepository.update(id, updateData);
            // Create an event for the update
            const changeDescription = Object.entries(data)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            await incidentRepository.addEvent({
                incidentId: id,
                message: `Incident updated: ${changeDescription}`,
                createdAt: new Date(),
            });
            // If the incident was resolved, send a notification
            if (data.status === 'resolved' && currentIncident.status !== 'resolved') {
                await this.sendIncidentResolvedNotification(updatedIncident);
            }
            return updatedIncident;
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error updating incident',
                error: error instanceof Error ? error.message : String(error),
                incidentId: id,
            });
            throw error;
        }
    }
    // Add an event to an incident
    async addIncidentEvent(incidentId, message) {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            return incidentRepository.addEvent({
                incidentId,
                message,
                createdAt: new Date(),
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error adding incident event',
                error: error instanceof Error ? error.message : String(error),
                incidentId,
            });
            throw error;
        }
    }
    // Resolve an incident
    async resolveIncident(id, message) {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            const incident = await incidentRepository.findById(id);
            if (!incident) {
                throw new Error(`Incident with ID ${id} not found`);
            }
            // Update the incident
            const updatedIncident = await incidentRepository.update(id, {
                status: 'resolved',
                resolvedAt: new Date(),
            });
            // Add an event
            await incidentRepository.addEvent({
                incidentId: id,
                message: message || 'Incident resolved',
                createdAt: new Date(),
            });
            // Send a notification
            await this.sendIncidentResolvedNotification(updatedIncident);
            return updatedIncident;
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error resolving incident',
                error: error instanceof Error ? error.message : String(error),
                incidentId: id,
            });
            throw error;
        }
    }
    // Send notification about resolved incident
    async sendIncidentResolvedNotification(incident) {
        try {
            const healthCheckName = incident.healthCheck?.name || 'Unknown service';
            // Prepare notification data
            const notificationData = {
                subject: `Incident Resolved: ${healthCheckName}`,
                results: [{
                        name: healthCheckName,
                        type: incident.healthCheck?.type || 'Service',
                        status: 'Resolved',
                        details: incident.details || 'The issue has been resolved',
                        lastChecked: new Date().toISOString(),
                    }],
                hasFailures: false,
            };
            // Send notification
            await notificationService_1.notificationService.sendHealthCheckNotification(notificationData);
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error sending incident resolved notification',
                error: error instanceof Error ? error.message : String(error),
                incidentId: incident.id,
            });
        }
    }
    // Get incident metrics
    async getIncidentMetrics() {
        try {
            const incidentRepository = (0, factory_1.getIncidentRepository)();
            return incidentRepository.getMetrics();
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error calculating incident metrics',
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
exports.incidentService = new IncidentService();
//# sourceMappingURL=incidentService.js.map