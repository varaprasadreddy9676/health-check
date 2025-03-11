import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import logger from '../utils/logger';
import { environment } from '../config/environment';
import axios from 'axios';
import { getNotificationRepository } from '../repositories/factory';

// Define notification data structure
interface HealthCheckNotificationData {
  subject: string;
  results: {
    name: string;
    type: string;
    status: string;
    details?: string;
    lastChecked: string;
  }[];
  hasFailures: boolean;
  highResourceUsage?: boolean;
}

class NotificationService {
  private emailTransporter!: nodemailer.Transporter;
  private emailTemplateCache: { [key: string]: handlebars.TemplateDelegate } = {};

  constructor() {
    // Initialize email transporter
    this.initializeEmailTransporter();
    
    // Register handlebars helpers
    this.registerHandlebarsHelpers();
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

  // Send health check notification (email and slack)
  async sendHealthCheckNotification(data: HealthCheckNotificationData): Promise<void> {
    try {
      // Send email notification
      await this.sendEmailNotification(data);
      
      // Send Slack notification
      await this.sendSlackNotification(data);
    } catch (error) {
      logger.error({
        msg: 'Failed to send health check notification',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Send email notification
  private async sendEmailNotification(data: HealthCheckNotificationData): Promise<void> {
    try {
      const notificationRepository = getNotificationRepository();
      
      // Get email configuration
      const emailConfig = await notificationRepository.getEmailConfig();
      
      // Skip if email is disabled
      if (!emailConfig || !emailConfig.enabled || emailConfig.recipients.length === 0) {
        logger.info({ msg: 'Email notifications are disabled, skipping' });
        return;
      }
      
      // Load the template
      const template = this.loadEmailTemplate('healthCheckEmail');
      
      // Generate the email content
      const currentDate = new Date().toLocaleString();
      const htmlContent = template({
        results: data.results,
        currentDate,
        subject: data.subject,
        hasFailures: data.hasFailures,
        highResourceUsage: data.highResourceUsage,
      });
      
      // Send the email
      const result = await this.emailTransporter.sendMail({
        from: environment.EMAIL_FROM,
        to: emailConfig.recipients.join(','),
        subject: data.subject,
        html: htmlContent,
      });
      
      // Log success
      logger.info({
        msg: 'Email notification sent',
        messageId: result.messageId,
        recipients: emailConfig.recipients,
      });
      
      // Save to database
      await notificationRepository.create({
        type: 'email',
        subject: data.subject,
        content: htmlContent,
        recipients: emailConfig.recipients,
        status: 'sent',
        createdAt: new Date(),
      });
    } catch (error) {
      logger.error({
        msg: 'Failed to send email notification',
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

  // Send Slack notification
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

  // Create Slack message
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
}

export const notificationService = new NotificationService();