import { Incident, IncidentEvent } from '../models/Incident';
import logger from '../utils/logger';
import { notificationService } from './notificationService';
import { getIncidentRepository } from '../repositories/factory';

class IncidentService {
  // Get all incidents with pagination
  async getIncidents(page = 1, limit = 10, status?: string): Promise<{
    incidents: Incident[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const incidentRepository = getIncidentRepository();
      
      const result = await incidentRepository.findAll(page, limit, status);
      
      return {
        incidents: result.incidents,
        total: result.total,
        page: page,
        pageSize: limit,
        totalPages: Math.ceil(result.total / limit),
      };
    } catch (error) {
      logger.error({
        msg: 'Error fetching incidents',
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
  
  // Get active incidents
  async getActiveIncidents(): Promise<Incident[]> {
    try {
      const incidentRepository = getIncidentRepository();
      return incidentRepository.findActive();
    } catch (error) {
      logger.error({
        msg: 'Error fetching active incidents',
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
  
  // Get a single incident with its events
  async getIncident(id: string): Promise<{
    incident: Incident | null;
    events: IncidentEvent[];
  }> {
    try {
      const incidentRepository = getIncidentRepository();
      
      const [incident, events] = await Promise.all([
        incidentRepository.findById(id),
        incidentRepository.getEvents(id),
      ]);
      
      return { incident, events };
    } catch (error) {
      logger.error({
        msg: 'Error fetching incident details',
        error: error instanceof Error ? error.message : String(error),
        incidentId: id,
      });
      
      throw error;
    }
  }
  
  // Update an incident
  async updateIncident(
    id: string,
    data: {
      status?: string;
      severity?: string;
      title?: string;
      details?: string;
      resolvedAt?: Date;
    }
  ): Promise<Incident> {
    try {
      const incidentRepository = getIncidentRepository();
      
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
    } catch (error) {
      logger.error({
        msg: 'Error updating incident',
        error: error instanceof Error ? error.message : String(error),
        incidentId: id,
      });
      
      throw error;
    }
  }
  
  // Add an event to an incident
  async addIncidentEvent(
    incidentId: string,
    message: string
  ): Promise<IncidentEvent> {
    try {
      const incidentRepository = getIncidentRepository();
      
      return incidentRepository.addEvent({
        incidentId,
        message,
        createdAt: new Date(),
      });
    } catch (error) {
      logger.error({
        msg: 'Error adding incident event',
        error: error instanceof Error ? error.message : String(error),
        incidentId,
      });
      
      throw error;
    }
  }
  
  // Resolve an incident
  async resolveIncident(id: string, message?: string): Promise<Incident> {
    try {
      const incidentRepository = getIncidentRepository();
      
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
    } catch (error) {
      logger.error({
        msg: 'Error resolving incident',
        error: error instanceof Error ? error.message : String(error),
        incidentId: id,
      });
      
      throw error;
    }
  }
  
  // Send notification about resolved incident
  private async sendIncidentResolvedNotification(
    incident: Incident
  ): Promise<void> {
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
      await notificationService.sendHealthCheckNotification(notificationData);
    } catch (error) {
      logger.error({
        msg: 'Error sending incident resolved notification',
        error: error instanceof Error ? error.message : String(error),
        incidentId: incident.id,
      });
    }
  }
  
  // Get incident metrics
  async getIncidentMetrics(): Promise<{
    total: number;
    active: number;
    resolved: number;
    mttr: number; // Mean time to resolution in minutes
  }> {
    try {
      const incidentRepository = getIncidentRepository();
      return incidentRepository.getMetrics();
    } catch (error) {
      logger.error({
        msg: 'Error calculating incident metrics',
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
}

export const incidentService = new IncidentService();