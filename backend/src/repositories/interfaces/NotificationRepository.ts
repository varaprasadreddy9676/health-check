import { Notification } from '../../models/Notification';
import { EmailConfig } from '../../models/EmailConfig';
import { SlackConfig } from '../../models/SlackConfig';
import { Subscription, CreateSubscriptionDto, UpdateSubscriptionDto } from '../../models/Subscription';

export interface NotificationRepository {
  // Existing notification operations
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
  
  // New subscription operations
  createSubscription(data: CreateSubscriptionDto): Promise<Subscription>;
  findSubscriptionById(id: string): Promise<Subscription | null>;
  findSubscriptionByToken(token: string, tokenType: 'verify' | 'unsubscribe'): Promise<Subscription | null>;
  findSubscriptionsByEmail(email: string): Promise<Subscription[]>;
  updateSubscription(id: string, data: UpdateSubscriptionDto): Promise<Subscription>;
  deleteSubscription(id: string): Promise<boolean>;
  verifySubscription(token: string): Promise<Subscription | null>;
  unsubscribe(token: string): Promise<Subscription | null>;
  
  // Get subscribers for a health check
  getSubscribersForHealthCheck(healthCheckId: string, severity: string): Promise<string[]>;
  getSubscribersForAllHealthChecks(severity: string): Promise<string[]>;
}