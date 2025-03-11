// Generic model for health checks that is database-agnostic
export interface HealthCheck {
    id: string;
    name: string;
    type: string; // 'API' | 'PROCESS' | 'SERVICE' | 'SERVER'
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    
    // Common fields
    checkInterval: number; // in seconds
    
    // API specific fields
    endpoint?: string;
    timeout?: number; // in ms
    
    // Process specific fields
    processKeyword?: string;
    port?: number;
    
    // Service specific fields
    customCommand?: string;
    expectedOutput?: string;
    
    // Restart capability
    restartCommand?: string;
    
    // Notification settings
    notifyOnFailure: boolean;
  }