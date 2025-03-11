// Database-agnostic model for notifications
export interface Notification {
    id: string;
    type: string; // 'email' | 'slack'
    subject: string;
    content: string;
    recipients: string[];
    status: string; // 'sent' | 'failed'
    createdAt: Date;
  }