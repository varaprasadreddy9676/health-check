// Database-agnostic model for incidents
export interface Incident {
    id: string;
    healthCheckId: string;
    title: string;
    status: string; // 'investigating' | 'identified' | 'monitoring' | 'resolved'
    severity: string; // 'critical' | 'high' | 'medium' | 'low'
    details?: string;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    
    // Optional relation (for join operations)
    healthCheck?: {
      name: string;
      type: string;
    };
    events?: IncidentEvent[];
  }
  
  // Type for incident events
  export interface IncidentEvent {
    id: string;
    incidentId: string;
    message: string;
    createdAt: Date;
  }