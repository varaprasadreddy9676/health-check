import { Incident } from '../../models/Incident';
import { IncidentEvent } from '../../models/IncidentEvent';

export interface IncidentRepository {
  // Incident operations
  findAll(page?: number, limit?: number, status?: string): Promise<{
    incidents: Incident[];
    total: number;
  }>;
  findActive(): Promise<Incident[]>;
  findById(id: string): Promise<Incident | null>;
  create(incident: Omit<Incident, 'id'>): Promise<Incident>;
  update(id: string, data: Partial<Incident>): Promise<Incident>;
  
  // Incident Event operations
  getEvents(incidentId: string): Promise<IncidentEvent[]>;
  addEvent(event: Omit<IncidentEvent, 'id'>): Promise<IncidentEvent>;
  
  // Metrics
  getMetrics(): Promise<{
    total: number;
    active: number;
    resolved: number;
    mttr: number;
  }>;

  // History retrieval
  getHistory(days: number): Promise<{ date: string; count: number }[]>;
}