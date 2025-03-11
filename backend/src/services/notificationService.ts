import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import logger from '../utils/logger';
import { environment } from '../config/environment';
import axios from 'axios';
import { getNotificationRepository } from '../repositories/factory';
import { Subscription, CreateSubscriptionDto } from '../models/Subscription';
import { HealthCheck } from '../models/HealthCheck';

// Define notification data structure
interface HealthCheckNotificationData {
  subject: string;
  results: {
    name: string;
    type: string;
    status: string;
    details?: string;
    lastChecked: string;
    healthCheckId?: string; // Added to track which health check triggered the notification
    severity?: string;      // Added to include severity information
  }[];
  hasFailures: boolean;
  highResourceUsage?: boolean;
}

// Added for subscription verification and management
interface SubscriptionEmailData {
  verifyUrl?: string;
  unsubscribeUrl?: string;
  email: string;
  healthCheckName?: string;
  isVerification: boolean;
}

class NotificationService {
  private emailTransporter!: nodemailer.Transporter;
  private emailTemplateCache: { [key: string]: handlebars.TemplateDelegate } = {};
  private baseUrl: string;

  constructor() {
    // Initialize email transporter
    this.initializeEmailTransporter();
    // Register handlebars helpers
    this.registerHandlebarsHelpers();
    // Set base URL for verification links
    this.baseUrl = environment.BASE_URL || 'http://localhost:3000';
  }

  // Initialize the email transporter
  private initializeEmailTransporter(): void {
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: environment.SMTP_HOST,
        port: environment.SMTP_PORT,
        secure: environment.SMTP_SECURE,
        auth: {
          user: environment.SMTP_USER,
          pass: environment.SMTP_PASS,
        },
      });
      logger.info({
        msg: 'Email transporter initialized',
        host: environment.SMTP_HOST,
        port: environment.SMTP_PORT,
      });
    } catch (error) {
      logger.error({
        msg: 'Failed to initialize email transporter',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Register handlebars helpers
  private registerHandlebarsHelpers(): void {
    handlebars.registerHelper('eq', function (a, b) {
      return a === b;
    });
    
    handlebars.registerHelper('formatDate', function (date) {
      if (!date) return '';
      return new Date(date).toLocaleString();
    });
    
    handlebars.registerHelper('getSeverityClass', function (severity) {
      switch (severity) {
        case 'critical': return 'critical';
        case 'high': return 'high';
        case 'medium': return 'medium';
        case 'low': return 'low';
        default: return '';
      }
    });
  }

  // Load email template
  private loadEmailTemplate(templateName: string): handlebars.TemplateDelegate {
    if (this.emailTemplateCache[templateName]) {
      return this.emailTemplateCache[templateName];
    }
    try {
      const templatePath = path.resolve(process.cwd(), 'src/templates', `${templateName}.html`);
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      this.emailTemplateCache[templateName] = template;
      return template;
    } catch (error) {
      logger.error({
        msg: `Failed to load email template: ${templateName}`,
        error: error instanceof Error ? error.message : String(error),
      });
      // Return a simple template as fallback
      const fallbackTemplate = handlebars.compile('<h1>{{subject}}</h1><pre>{{JSON.stringify data}}</pre>');
      this.emailTemplateCache[templateName] = fallbackTemplate;
      return fallbackTemplate;
    }
  }

  // Create a subscription
  async createSubscription(data: CreateSubscriptionDto): Promise<Subscription> {
    try {
      const notificationRepository = getNotificationRepository();
      
      // Create subscription
      const subscription = await notificationRepository.createSubscription(data);
      
      // If healthCheckId is provided, get the health check info
      let healthCheckName = 'All health checks';
      if (data.healthCheckId) {
        const healthCheck = await this.getHealthCheckInfo(data.healthCheckId);
        if (healthCheck) {
          healthCheckName = healthCheck.name;
        }
      }
      
      // Send verification email if not already verified
      if (!subscription.verifiedAt && subscription.verifyToken) {
        await this.sendSubscriptionEmail({
          verifyUrl: `${this.baseUrl}/api/notifications/subscriptions/verify/${subscription.verifyToken}`,
          unsubscribeUrl: `${this.baseUrl}/api/notifications/subscriptions/unsubscribe/${subscription.unsubscribeToken}`,
          email: subscription.email,
          healthCheckName,
          isVerification: true
        });
      }
      
      return subscription;
    } catch (error) {
      logger.error({
        msg: 'Failed to create subscription',
        error: error instanceof Error ? error.message : String(error),
        data
      });
      throw error;
    }
  }

  // Verify a subscription
  async verifySubscription(token: string): Promise<Subscription | null> {
    try {
      const notificationRepository = getNotificationRepository();
      const subscription = await notificationRepository.verifySubscription(token);
      
      if (subscription) {
        // Get health check name
        let healthCheckName = 'All health checks';
        if (subscription.healthCheckId) {
          const healthCheck = await this.getHealthCheckInfo(subscription.healthCheckId);
          if (healthCheck) {
            healthCheckName = healthCheck.name;
          }
        }
        
        // Send confirmation email
        await this.sendSubscriptionEmail({
          unsubscribeUrl: `${this.baseUrl}/api/notifications/subscriptions/unsubscribe/${subscription.unsubscribeToken}`,
          email: subscription.email,
          healthCheckName,
          isVerification: false
        });
      }
      
      return subscription;
    } catch (error) {
      logger.error({
        msg: 'Failed to verify subscription',
        error: error instanceof Error ? error.message : String(error),
        token
      });
      throw error;
    }
  }

  // Unsubscribe
  async unsubscribe(token: string): Promise<Subscription | null> {
    try {
      const notificationRepository = getNotificationRepository();
      return notificationRepository.unsubscribe(token);
    } catch (error) {
      logger.error({
        msg: 'Failed to unsubscribe',
        error: error instanceof Error ? error.message : String(error),
        token
      });
      throw error;
    }
  }

  // Get health check info
  private async getHealthCheckInfo(healthCheckId: string): Promise<HealthCheck | null> {
    try {
      const healthCheckRepository = getNotificationRepository();
      // This would need to be implemented properly to use the health check repository
      // For now, we'll just return null
      return null;
    } catch (error) {
      logger.error({
        msg: 'Failed to get health check info',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId
      });
      return null;
    }
  }

  // Send subscription verification or confirmation email
  private async sendSubscriptionEmail(data: SubscriptionEmailData): Promise<void> {
    try {
      // Load the appropriate template
      const templateName = data.isVerification ? 'subscriptionVerifyEmail' : 'subscriptionConfirmEmail';
      const template = this.loadEmailTemplate(templateName);
      
      // Generate the email content
      const htmlContent = template({
        email: data.email,
        healthCheckName: data.healthCheckName || 'All health checks',
        verifyUrl: data.verifyUrl,
        unsubscribeUrl: data.unsubscribeUrl,
        currentDate: new Date().toLocaleString()
      });
      
      // Subject line
      const subject = data.isVerification
        ? `Verify your health check notification subscription for ${data.healthCheckName}`
        : `Subscription confirmed for ${data.healthCheckName} notifications`;
      
      // Send the email
      const result = await this.emailTransporter.sendMail({
        from: environment.EMAIL_FROM,
        to: data.email,
        subject,
        html: htmlContent,
      });
      
      // Log success
      logger.info({
        msg: `Subscription ${data.isVerification ? 'verification' : 'confirmation'} email sent`,
        messageId: result.messageId,
        recipient: data.email,
      });
    } catch (error) {
      logger.error({
        msg: `Failed to send subscription ${data.isVerification ? 'verification' : 'confirmation'} email`,
        error: error instanceof Error ? error.message : String(error),
        email: data.email,
      });
    }
  }

  // Send health check notification (email and slack) - UPDATED TO USE SUBSCRIPTIONS
  async sendHealthCheckNotification(data: HealthCheckNotificationData): Promise<void> {
    try {
      // Send email notification using subscriptions
      await this.sendTargetedEmailNotification(data);
      
      // Send Slack notification (unchanged)
      await this.sendSlackNotification(data);
    } catch (error) {
      logger.error({
        msg: 'Failed to send health check notification',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Send targeted email notification based on subscriptions - NEW METHOD
  private async sendTargetedEmailNotification(data: HealthCheckNotificationData): Promise<void> {
    try {
      const notificationRepository = getNotificationRepository();
      
      // Determine the severity for notifications
      const severity = this.determineSeverity(data);
      
      // Collect recipients for each unhealthy health check
      const targetedRecipients: Map<string, Set<string>> = new Map();
      
      // Add global subscribers (those who want ALL notifications)
      const globalSubscribers = await notificationRepository.getSubscribersForAllHealthChecks(severity);
      if (globalSubscribers.length > 0) {
        targetedRecipients.set('global', new Set(globalSubscribers));
      }
      
      // Get subscribers for specific health checks
      for (const result of data.results) {
        if (result.healthCheckId && result.status === 'Unhealthy') {
          const subscribers = await notificationRepository.getSubscribersForHealthCheck(
            result.healthCheckId,
            severity
          );
          
          if (subscribers.length > 0) {
            targetedRecipients.set(result.healthCheckId, new Set(subscribers));
          }
        }
      }
      
      // If no subscribers found, fallback to default email config
      if (targetedRecipients.size === 0) {
        const emailConfig = await notificationRepository.getEmailConfig();
        if (emailConfig && emailConfig.enabled && emailConfig.recipients.length > 0) {
          targetedRecipients.set('default', new Set(emailConfig.recipients));
        } else {
          logger.info({ msg: 'No subscribers for this notification, skipping email' });
          return;
        }
      }
      
      // Load the template
      const template = this.loadEmailTemplate('healthCheckEmail');
      
      // Send targeted emails
      for (const [key, recipients] of targetedRecipients.entries()) {
        if (recipients.size === 0) continue;
        
        // Filter results based on subscription type
        let relevantResults = [...data.results];
        if (key !== 'global' && key !== 'default') {
          // For specific health check subscribers, only include that health check
          relevantResults = data.results.filter(r => r.healthCheckId === key);
        }
        
        // Generate the email content
        const currentDate = new Date().toLocaleString();
        const htmlContent = template({
          results: relevantResults,
          currentDate,
          subject: data.subject,
          hasFailures: data.hasFailures,
          highResourceUsage: data.highResourceUsage,
          // Add unsubscribe instruction at the bottom
          unsubscribeMsg: 'To update your notification preferences or unsubscribe, click the link at the bottom of previous notification emails.'
        });
        
        // Send the email
        const recipientsList = Array.from(recipients);
        const result = await this.emailTransporter.sendMail({
          from: environment.EMAIL_FROM,
          to: recipientsList.join(','),
          subject: data.subject,
          html: htmlContent,
        });
        
        // Log success
        logger.info({
          msg: 'Targeted email notification sent',
          messageId: result.messageId,
          recipients: recipientsList,
          subscriptionType: key === 'global' ? 'global' : (key === 'default' ? 'default' : 'specific'),
        });
        
        // Save to database
        await notificationRepository.create({
          type: 'email',
          subject: data.subject,
          content: htmlContent,
          recipients: recipientsList,
          status: 'sent',
          createdAt: new Date(),
        });
      }
    } catch (error) {
      logger.error({
        msg: 'Failed to send targeted email notification',
        error: error instanceof Error ? error.message : String(error),
      });
      const notificationRepository = getNotificationRepository();
      // Save failure to database
      await notificationRepository.create({
        type: 'email',
        subject: data.subject,
        content: 'Failed to send email',
        recipients: [],
        status: 'failed',
        createdAt: new Date(),
      });
    }
  }
  
  // Helper method to determine severity based on notification data
  private determineSeverity(data: HealthCheckNotificationData): string {
    // If any result has an explicit severity, use the highest one
    const explicitSeverities = data.results
      .filter(r => r.severity)
      .map(r => r.severity);
    
    if (explicitSeverities.includes('critical')) return 'critical';
    if (explicitSeverities.includes('high')) return 'high';
    
    // Otherwise determine based on number of failures
    if (data.results.filter(r => r.status === 'Unhealthy').length > 3) {
      return 'critical';
    } else if (data.hasFailures) {
      return 'high';
    }
    
    return 'all';
  }

  // Send Slack notification (unchanged from original)
  private async sendSlackNotification(data: HealthCheckNotificationData): Promise<void> {
    try {
      const notificationRepository = getNotificationRepository();
      // Get Slack configuration
      const slackConfig = await notificationRepository.getSlackConfig();
      // Skip if Slack is disabled or webhookUrl is not set
      if (!slackConfig || !slackConfig.enabled || !slackConfig.webhookUrl) {
        logger.info({ msg: 'Slack notifications are disabled, skipping' });
        return;
      }
      // Create Slack message
      const message = this.createSlackMessage(data);
      // Send the message
      const response = await axios.post(slackConfig.webhookUrl, message);
      // Check if successful
      if (response.status === 200) {
        logger.info({ msg: 'Slack notification sent' });
        // Save to database
        await notificationRepository.create({
          type: 'slack',
          subject: data.subject,
          content: JSON.stringify(message),
          recipients: slackConfig.channel ? [slackConfig.channel] : [],
          status: 'sent',
          createdAt: new Date(),
        });
      } else {
        throw new Error(`Slack API returned status code ${response.status}`);
      }
    } catch (error) {
      logger.error({
        msg: 'Failed to send Slack notification',
        error: error instanceof Error ? error.message : String(error),
      });
      const notificationRepository = getNotificationRepository();
      // Save failure to database
      await notificationRepository.create({
        type: 'slack',
        subject: data.subject,
        content: 'Failed to send Slack notification',
        recipients: [],
        status: 'failed',
        createdAt: new Date(),
      });
    }
  }

  // Create Slack message (unchanged from original)
  private createSlackMessage(data: HealthCheckNotificationData): any {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: data.subject,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Time:* ${new Date().toLocaleString()}`
        }
      },
      {
        type: 'divider'
      }
    ];
    // Add blocks for each unhealthy service
    data.results.forEach(result => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${result.name}* (${result.type})\n*Status:* ${result.status}\n*Details:* ${result.details || 'No details provided'}`
        }
      });
    });
    return {
      blocks
    };
  }

  // Get all subscriptions for an email
  async getSubscriptionsByEmail(email: string): Promise<Subscription[]> {
    try {
      const notificationRepository = getNotificationRepository();
      return notificationRepository.findSubscriptionsByEmail(email);
    } catch (error) {
      logger.error({
        msg: 'Failed to get subscriptions by email',
        error: error instanceof Error ? error.message : String(error),
        email
      });
      throw error;
    }
  }

  // Update a subscription
  async updateSubscription(id: string, data: { active?: boolean; severity?: 'all' | 'high' | 'critical' }): Promise<Subscription> {
    try {
      const notificationRepository = getNotificationRepository();
      return notificationRepository.updateSubscription(id, data);
    } catch (error) {
      logger.error({
        msg: 'Failed to update subscription',
        error: error instanceof Error ? error.message : String(error),
        id,
        data
      });
      throw error;
    }
  }

  // Delete a subscription
  async deleteSubscription(id: string): Promise<boolean> {
    try {
      const notificationRepository = getNotificationRepository();
      return notificationRepository.deleteSubscription(id);
    } catch (error) {
      logger.error({
        msg: 'Failed to delete subscription',
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
}

export const notificationService = new NotificationService();