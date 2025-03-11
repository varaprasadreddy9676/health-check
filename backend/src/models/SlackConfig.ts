// Database-agnostic model for Slack notification configuration
export interface SlackConfig {
    id: string;
    webhookUrl: string;
    channel?: string;
    throttleMinutes: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }