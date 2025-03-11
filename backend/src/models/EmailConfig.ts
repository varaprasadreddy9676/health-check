// Database-agnostic model for email notification configuration
export interface EmailConfig {
    id: string;
    recipients: string[];
    throttleMinutes: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }