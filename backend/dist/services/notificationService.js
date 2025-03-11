"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const logger_1 = __importDefault(require("../utils/logger"));
const environment_1 = require("../config/environment");
const axios_1 = __importDefault(require("axios"));
const factory_1 = require("../repositories/factory");
class NotificationService {
    constructor() {
        this.emailTemplateCache = {};
        // Initialize email transporter
        this.initializeEmailTransporter();
        // Register handlebars helpers
        this.registerHandlebarsHelpers();
        // Set base URL for verification links
        this.baseUrl = environment_1.environment.BASE_URL || 'http://localhost:3000';
    }
    // Initialize the email transporter
    initializeEmailTransporter() {
        try {
            this.emailTransporter = nodemailer_1.default.createTransport({
                host: environment_1.environment.SMTP_HOST,
                port: environment_1.environment.SMTP_PORT,
                secure: environment_1.environment.SMTP_SECURE,
                auth: {
                    user: environment_1.environment.SMTP_USER,
                    pass: environment_1.environment.SMTP_PASS,
                },
            });
            logger_1.default.info({
                msg: 'Email transporter initialized',
                host: environment_1.environment.SMTP_HOST,
                port: environment_1.environment.SMTP_PORT,
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to initialize email transporter',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Register handlebars helpers
    registerHandlebarsHelpers() {
        handlebars_1.default.registerHelper('eq', function (a, b) {
            return a === b;
        });
        handlebars_1.default.registerHelper('formatDate', function (date) {
            if (!date)
                return '';
            return new Date(date).toLocaleString();
        });
        handlebars_1.default.registerHelper('getSeverityClass', function (severity) {
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
    loadEmailTemplate(templateName) {
        if (this.emailTemplateCache[templateName]) {
            return this.emailTemplateCache[templateName];
        }
        try {
            const templatePath = path_1.default.resolve(process.cwd(), 'src/templates', `${templateName}.html`);
            const templateSource = fs_1.default.readFileSync(templatePath, 'utf8');
            const template = handlebars_1.default.compile(templateSource);
            this.emailTemplateCache[templateName] = template;
            return template;
        }
        catch (error) {
            logger_1.default.error({
                msg: `Failed to load email template: ${templateName}`,
                error: error instanceof Error ? error.message : String(error),
            });
            // Return a simple template as fallback
            const fallbackTemplate = handlebars_1.default.compile('<h1>{{subject}}</h1><pre>{{JSON.stringify data}}</pre>');
            this.emailTemplateCache[templateName] = fallbackTemplate;
            return fallbackTemplate;
        }
    }
    // Create a subscription
    async createSubscription(data) {
        try {
            const notificationRepository = (0, factory_1.getNotificationRepository)();
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
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to create subscription',
                error: error instanceof Error ? error.message : String(error),
                data
            });
            throw error;
        }
    }
    // Verify a subscription
    async verifySubscription(token) {
        try {
            const notificationRepository = (0, factory_1.getNotificationRepository)();
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
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to verify subscription',
                error: error instanceof Error ? error.message : String(error),
                token
            });
            throw error;
        }
    }
    // Unsubscribe
    async unsubscribe(token) {
        try {
            const notificationRepository = (0, factory_1.getNotificationRepository)();
            return notificationRepository.unsubscribe(token);
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to unsubscribe',
                error: error instanceof Error ? error.message : String(error),
                token
            });
            throw error;
        }
    }
    // Get health check info
    async getHealthCheckInfo(healthCheckId) {
        try {
            const healthCheckRepository = (0, factory_1.getNotificationRepository)();
            // This would need to be implemented properly to use the health check repository
            // For now, we'll just return null
            return null;
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to get health check info',
                error: error instanceof Error ? error.message : String(error),
                healthCheckId
            });
            return null;
        }
    }
    // Send subscription verification or confirmation email
    async sendSubscriptionEmail(data) {
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
                from: environment_1.environment.EMAIL_FROM,
                to: data.email,
                subject,
                html: htmlContent,
            });
            // Log success
            logger_1.default.info({
                msg: `Subscription ${data.isVerification ? 'verification' : 'confirmation'} email sent`,
                messageId: result.messageId,
                recipient: data.email,
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: `Failed to send subscription ${data.isVerification ? 'verification' : 'confirmation'} email`,
                error: error instanceof Error ? error.message : String(error),
                email: data.email,
            });
        }
    }
    // Send health check notification (email and slack) - UPDATED TO USE SUBSCRIPTIONS
    async sendHealthCheckNotification(data) {
        try {
            // Send email notification using subscriptions
            await this.sendTargetedEmailNotification(data);
            // Send Slack notification (unchanged)
            await this.sendSlackNotification(data);
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to send health check notification',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Send targeted email notification based on subscriptions - NEW METHOD
    async sendTargetedEmailNotification(data) {
        try {
            const notificationRepository = (0, factory_1.getNotificationRepository)();
            // Determine the severity for notifications
            const severity = this.determineSeverity(data);
            // Collect recipients for each unhealthy health check
            const targetedRecipients = new Map();
            // Add global subscribers (those who want ALL notifications)
            const globalSubscribers = await notificationRepository.getSubscribersForAllHealthChecks(severity);
            if (globalSubscribers.length > 0) {
                targetedRecipients.set('global', new Set(globalSubscribers));
            }
            // Get subscribers for specific health checks
            for (const result of data.results) {
                if (result.healthCheckId && result.status === 'Unhealthy') {
                    const subscribers = await notificationRepository.getSubscribersForHealthCheck(result.healthCheckId, severity);
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
                }
                else {
                    logger_1.default.info({ msg: 'No subscribers for this notification, skipping email' });
                    return;
                }
            }
            // Load the template
            const template = this.loadEmailTemplate('healthCheckEmail');
            // Send targeted emails
            for (const [key, recipients] of targetedRecipients.entries()) {
                if (recipients.size === 0)
                    continue;
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
                    from: environment_1.environment.EMAIL_FROM,
                    to: recipientsList.join(','),
                    subject: data.subject,
                    html: htmlContent,
                });
                // Log success
                logger_1.default.info({
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
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to send targeted email notification',
                error: error instanceof Error ? error.message : String(error),
            });
            const notificationRepository = (0, factory_1.getNotificationRepository)();
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
    determineSeverity(data) {
        // If any result has an explicit severity, use the highest one
        const explicitSeverities = data.results
            .filter(r => r.severity)
            .map(r => r.severity);
        if (explicitSeverities.includes('critical'))
            return 'critical';
        if (explicitSeverities.includes('high'))
            return 'high';
        // Otherwise determine based on number of failures
        if (data.results.filter(r => r.status === 'Unhealthy').length > 3) {
            return 'critical';
        }
        else if (data.hasFailures) {
            return 'high';
        }
        return 'all';
    }
    // Send Slack notification (unchanged from original)
    async sendSlackNotification(data) {
        try {
            const notificationRepository = (0, factory_1.getNotificationRepository)();
            // Get Slack configuration
            const slackConfig = await notificationRepository.getSlackConfig();
            // Skip if Slack is disabled or webhookUrl is not set
            if (!slackConfig || !slackConfig.enabled || !slackConfig.webhookUrl) {
                logger_1.default.info({ msg: 'Slack notifications are disabled, skipping' });
                return;
            }
            // Create Slack message
            const message = this.createSlackMessage(data);
            // Send the message
            const response = await axios_1.default.post(slackConfig.webhookUrl, message);
            // Check if successful
            if (response.status === 200) {
                logger_1.default.info({ msg: 'Slack notification sent' });
                // Save to database
                await notificationRepository.create({
                    type: 'slack',
                    subject: data.subject,
                    content: JSON.stringify(message),
                    recipients: slackConfig.channel ? [slackConfig.channel] : [],
                    status: 'sent',
                    createdAt: new Date(),
                });
            }
            else {
                throw new Error(`Slack API returned status code ${response.status}`);
            }
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to send Slack notification',
                error: error instanceof Error ? error.message : String(error),
            });
            const notificationRepository = (0, factory_1.getNotificationRepository)();
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
    createSlackMessage(data) {
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
    async getSubscriptionsByEmail(email) {
        try {
            const notificationRepository = (0, factory_1.getNotificationRepository)();
            return notificationRepository.findSubscriptionsByEmail(email);
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to get subscriptions by email',
                error: error instanceof Error ? error.message : String(error),
                email
            });
            throw error;
        }
    }
    // Update a subscription
    async updateSubscription(id, data) {
        try {
            const notificationRepository = (0, factory_1.getNotificationRepository)();
            return notificationRepository.updateSubscription(id, data);
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to update subscription',
                error: error instanceof Error ? error.message : String(error),
                id,
                data
            });
            throw error;
        }
    }
    // Delete a subscription
    async deleteSubscription(id) {
        try {
            const notificationRepository = (0, factory_1.getNotificationRepository)();
            return notificationRepository.deleteSubscription(id);
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to delete subscription',
                error: error instanceof Error ? error.message : String(error),
                id
            });
            throw error;
        }
    }
}
exports.notificationService = new NotificationService();
//# sourceMappingURL=notificationService.js.map