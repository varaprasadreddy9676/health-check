// Database-agnostic model for incident events
export interface IncidentEvent {
    id: string;
    incidentId: string;
    message: string;
    createdAt: Date;
    
    // Optional relation (for join operations)
    incident?: {
      id: string;
      title: string;
    };
  }