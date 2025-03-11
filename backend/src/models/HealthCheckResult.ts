// Database-agnostic model for health check results
export interface HealthCheckResult {
    id: string;
    healthCheckId: string;
    status: string; // 'Healthy' | 'Unhealthy'
    details?: string;
    memoryUsage?: number;
    cpuUsage?: number;
    responseTime?: number; // in ms
    createdAt: Date;
    
    // Optional relation (for join operations)
    healthCheck?: {
      name: string;
      type: string;
    };
  }