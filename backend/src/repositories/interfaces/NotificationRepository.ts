import { Notification } from '../../models/Notification';
import { EmailConfig } from '../../models/EmailConfig';
import { SlackConfig } from '../../models/SlackConfig';

export interface NotificationRepository {
  // Notification operations
  findAll(page?: number, limit?: number, type?: string): Promise<{
    notifications: Notification[];
    total: number;
  }>;
  create(notification: Omit<Notification, 'id'>): Promise<Notification>;
  
  // Email config operations
  getEmailConfig(): Promise<EmailConfig | null>;
  updateEmailConfig(data: Partial<EmailConfig>): Promise<EmailConfig>;
  
  // Slack config operations
  getSlackConfig(): Promise<SlackConfig | null>;
  updateSlackConfig(data: Partial<SlackConfig>): Promise<SlackConfig>;
  
  // Get last notification time for throttling
  getLastNotificationTime(type: string): Promise<Date | null>;
}