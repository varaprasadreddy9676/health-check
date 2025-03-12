import { notificationRepository } from '../repositories/notificationRepository';
import { sendEmail } from '../config/email';
import {
    renderHealthCheckAlertEmail,
    renderSubscriptionVerificationEmail,
    renderSubscriptionConfirmedEmail
} from '../utils/emailTemplates';
import { env } from '../config/env';
import { SeverityLevel, ISubscription } from '../models/Subscription';
import { healthCheckRepository } from '../repositories/healthCheckRepository';
import logger from '../utils/logger';

// Alert data interface
export interface HealthCheckAlertData {
    healthCheckId: string;
    name: string;
    type: string;
    status: string;
    details: string;
    cpuUsage?: number;
    memoryUsage?: number;
    responseTime?: number;
}

// Subscription data interface
export interface SubscriptionData {
    email: string;
    healthCheckId?: string;
    healthCheckName?: string;
    severity?: SeverityLevel;
}

// Subscription response interface
export interface SubscriptionResponse {
    id: string;
    email: string;
    healthCheckId: string | null;
    healthCheckName?: string;
    active: boolean;
    severity: SeverityLevel;
    verified: boolean;
}

// Notification service
export class NotificationService {
    /**
     * Send health check alert
     */
    async sendHealthCheckAlert(data: HealthCheckAlertData): Promise<boolean> {
        try {
            // Check if we should throttle this notification
            const shouldThrottle = await notificationRepository.shouldThrottleEmail();
            if (shouldThrottle) {
                logger.info({
                    msg: 'Email notification throttled',
                    healthCheckId: data.healthCheckId,
                    name: data.name
                });
                return false;
            }

            // Determine severity
            let severity = 'high';
            if (data.type === 'SERVER' || data.responseTime && data.responseTime > 10000) {
                severity = 'critical';
            }

            // Get specific and global subscribers
            const [specificSubscribers, globalSubscribers, emailConfig] = await Promise.all([
                notificationRepository.getSubscribersForHealthCheck(data.healthCheckId, severity),
                notificationRepository.getGlobalSubscribers(severity),
                notificationRepository.getEmailConfig()
            ]);

            // Combine unique subscribers
            const allSubscribers = [...new Set([...specificSubscribers, ...globalSubscribers])];

            // If no subscribers are configured, use the default email config
            let recipientsList = allSubscribers;
            if (recipientsList.length === 0 && emailConfig.enabled && emailConfig.recipients.length > 0) {
                recipientsList = emailConfig.recipients;
            }

            // If still no recipients, log and return
            if (recipientsList.length === 0) {
                logger.info({
                    msg: 'No recipients configured for notification',
                    healthCheckId: data.healthCheckId,
                    name: data.name
                });
                return false;
            }

            // Render email template
            const subject = `Health Check Alert: ${data.name} is ${data.status}`;
            // Use the new template system instead of the old renderEmailTemplate
            const html = renderHealthCheckAlertEmail({
                subject,
                results: [
                    {
                        name: data.name,
                        type: data.type,
                        status: data.status,
                        details: data.details,
                        cpuUsage: data.cpuUsage,
                        memoryUsage: data.memoryUsage,
                        responseTime: data.responseTime
                    }
                ],
                timestamp: new Date(),
                currentYear: new Date().getFullYear(),
                dashboardUrl: `${env.BASE_URL}/dashboard`
            });

            // Send email
            const emailSent = await sendEmail(recipientsList, subject, html);

            if (emailSent) {
                // Record notification
                await notificationRepository.createNotification({
                    type: 'email',
                    subject,
                    content: html,
                    recipients: recipientsList,
                    status: 'sent'
                });

                // Update last sent time
                await notificationRepository.updateLastSentTime();

                logger.info({
                    msg: 'Health check alert email sent',
                    healthCheckId: data.healthCheckId,
                    name: data.name,
                    recipients: recipientsList.length
                });
                return true;
            } else {
                // Record failed notification
                await notificationRepository.createNotification({
                    type: 'email',
                    subject,
                    content: html,
                    recipients: recipientsList,
                    status: 'failed'
                });

                logger.error({
                    msg: 'Failed to send health check alert email',
                    healthCheckId: data.healthCheckId,
                    name: data.name
                });
                return false;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error sending health check alert',
                error: errorMessage,
                healthCheckId: data.healthCheckId,
                name: data.name
            });
            return false;
        }
    }

    /**
     * Create subscription
     */
    async createSubscription(data: SubscriptionData): Promise<SubscriptionResponse> {
        try {
            let healthCheckName = data.healthCheckName || 'All health checks';

            // If we have a healthCheckId but no name, try to fetch it
            if (data.healthCheckId && !data.healthCheckName) {
                const healthCheck = await healthCheckRepository.findById(data.healthCheckId);
                if (healthCheck) {
                    healthCheckName = healthCheck.name;
                }
            }

            // Create subscription in database
            const subscription = await notificationRepository.createSubscription(
                data.email,
                data.healthCheckId,
                data.severity
            );

            // If not verified, send verification email
            if (!subscription.verifiedAt) {
                await this.sendVerificationEmail(
                    subscription.email,
                    subscription.verifyToken!,
                    subscription.unsubscribeToken,
                    healthCheckName
                );
            }

            logger.info({
                msg: 'Subscription created',
                email: data.email,
                healthCheckId: data.healthCheckId,
                verified: !!subscription.verifiedAt
            });

            return {
                id: subscription.id,
                email: subscription.email,
                healthCheckId: subscription.healthCheckId ? subscription.healthCheckId.toString() : null,
                healthCheckName,
                active: subscription.active,
                severity: subscription.severity,
                verified: !!subscription.verifiedAt
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error creating subscription',
                error: errorMessage,
                email: data.email,
                healthCheckId: data.healthCheckId
            });
            throw error;
        }
    }

    /**
     * Send verification email
     */
    private async sendVerificationEmail(
        email: string,
        verifyToken: string,
        unsubscribeToken: string,
        healthCheckName: string
    ): Promise<boolean> {
        try {
            const verifyUrl = `${env.BASE_URL}/api/notifications/subscriptions/verify/${verifyToken}`;
            const unsubscribeUrl = `${env.BASE_URL}/api/notifications/subscriptions/unsubscribe/${unsubscribeToken}`;

            const subject = `Verify Your Health Check Subscription`;
            // Use the new template system
            const html = renderSubscriptionVerificationEmail({
                verifyUrl,
                unsubscribeUrl,
                healthCheckName,
                email,
                currentYear: new Date().getFullYear()
            });


            const emailSent = await sendEmail(email, subject, html);

            if (emailSent) {
                await notificationRepository.createNotification({
                    type: 'email',
                    subject,
                    content: html,
                    recipients: [email],
                    status: 'sent'
                });

                logger.info({
                    msg: 'Subscription verification email sent',
                    email
                });
                return true;
            } else {
                await notificationRepository.createNotification({
                    type: 'email',
                    subject,
                    content: html,
                    recipients: [email],
                    status: 'failed'
                });

                logger.error({
                    msg: 'Failed to send subscription verification email',
                    email
                });
                return false;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error sending verification email',
                error: errorMessage,
                email
            });
            return false;
        }
    }

    /**
     * Verify subscription
     */
    async verifySubscription(token: string): Promise<SubscriptionResponse | null> {
        try {
            const subscription = await notificationRepository.verifySubscription(token);

            if (!subscription) {
                return null;
            }

            // Get health check name
            let healthCheckName = 'All health checks';

            try {
                if (subscription.healthCheckId) {
                    const healthCheck = await healthCheckRepository.findById(
                        typeof subscription.healthCheckId === 'string'
                            ? subscription.healthCheckId
                            : subscription.healthCheckId.toString()
                    );

                    if (healthCheck) {
                        healthCheckName = healthCheck.name;
                    }
                }
            } catch (error) {
                logger.warn({
                    msg: 'Error fetching health check name for subscription',
                    error: error instanceof Error ? error.message : String(error),
                    subscriptionId: subscription.id
                });
            }

            // Send confirmation email
            await this.sendConfirmationEmail(
                subscription.email,
                subscription.unsubscribeToken,
                healthCheckName
            );

            logger.info({
                msg: 'Subscription verified',
                id: subscription.id,
                email: subscription.email
            });

            return {
                id: subscription.id,
                email: subscription.email,
                healthCheckId: subscription.healthCheckId ?
                    (typeof subscription.healthCheckId === 'string'
                        ? subscription.healthCheckId
                        : subscription.healthCheckId.toString())
                    : null,
                healthCheckName,
                active: subscription.active,
                severity: subscription.severity,
                verified: true
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error verifying subscription',
                error: errorMessage,
                token
            });
            throw error;
        }
    }

    /**
     * Send confirmation email
     */
    private async sendConfirmationEmail(
        email: string,
        unsubscribeToken: string,
        healthCheckName: string
    ): Promise<boolean> {
        try {
            const unsubscribeUrl = `${env.BASE_URL}/api/notifications/subscriptions/unsubscribe/${unsubscribeToken}`;

            const subject = `Subscription Confirmed`;
            // Use the new template system
            const html = renderSubscriptionConfirmedEmail({
                unsubscribeUrl,
                healthCheckName,
                email,
                currentYear: new Date().getFullYear(),
                dashboardUrl: `${env.BASE_URL}/dashboard`
            });


            const emailSent = await sendEmail(email, subject, html);

            if (emailSent) {
                await notificationRepository.createNotification({
                    type: 'email',
                    subject,
                    content: html,
                    recipients: [email],
                    status: 'sent'
                });

                logger.info({
                    msg: 'Subscription confirmation email sent',
                    email
                });
                return true;
            } else {
                await notificationRepository.createNotification({
                    type: 'email',
                    subject,
                    content: html,
                    recipients: [email],
                    status: 'failed'
                });

                logger.error({
                    msg: 'Failed to send subscription confirmation email',
                    email
                });
                return false;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error sending confirmation email',
                error: errorMessage,
                email
            });
            return false;
        }
    }

    /**
     * Unsubscribe
     */
    async unsubscribe(token: string): Promise<SubscriptionResponse | null> {
        try {
            const subscription = await notificationRepository.unsubscribe(token);

            if (!subscription) {
                return null;
            }

            // Get health check name
            let healthCheckName = 'All health checks';

            try {
                if (subscription.healthCheckId) {
                    const healthCheck = await healthCheckRepository.findById(
                        typeof subscription.healthCheckId === 'string'
                            ? subscription.healthCheckId
                            : subscription.healthCheckId.toString()
                    );

                    if (healthCheck) {
                        healthCheckName = healthCheck.name;
                    }
                }
            } catch (error) {
                logger.warn({
                    msg: 'Error fetching health check name for unsubscription',
                    error: error instanceof Error ? error.message : String(error),
                    subscriptionId: subscription.id
                });
            }

            logger.info({
                msg: 'Subscription unsubscribed',
                id: subscription.id,
                email: subscription.email
            });

            return {
                id: subscription.id,
                email: subscription.email,
                healthCheckId: subscription.healthCheckId ?
                    (typeof subscription.healthCheckId === 'string'
                        ? subscription.healthCheckId
                        : subscription.healthCheckId.toString())
                    : null,
                healthCheckName,
                active: subscription.active,
                severity: subscription.severity,
                verified: !!subscription.verifiedAt
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error unsubscribing',
                error: errorMessage,
                token
            });
            throw error;
        }
    }

    /**
     * Update subscription
     */
    async updateSubscription(id: string, data: { active?: boolean; severity?: SeverityLevel }): Promise<SubscriptionResponse | null> {
        try {
            const subscription = await notificationRepository.updateSubscription(id, data);

            if (!subscription) {
                return null;
            }

            // Get health check name
            let healthCheckName = 'All health checks';

            try {
                if (subscription.healthCheckId) {
                    const healthCheck = await healthCheckRepository.findById(
                        typeof subscription.healthCheckId === 'string'
                            ? subscription.healthCheckId
                            : subscription.healthCheckId.toString()
                    );

                    if (healthCheck) {
                        healthCheckName = healthCheck.name;
                    }
                }
            } catch (error) {
                logger.warn({
                    msg: 'Error fetching health check name for subscription update',
                    error: error instanceof Error ? error.message : String(error),
                    subscriptionId: subscription.id
                });
            }

            logger.info({
                msg: 'Subscription updated',
                id,
                data
            });

            return {
                id: subscription.id,
                email: subscription.email,
                healthCheckId: subscription.healthCheckId ?
                    (typeof subscription.healthCheckId === 'string'
                        ? subscription.healthCheckId
                        : subscription.healthCheckId.toString())
                    : null,
                healthCheckName,
                active: subscription.active,
                severity: subscription.severity,
                verified: !!subscription.verifiedAt
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error updating subscription',
                error: errorMessage,
                id,
                data
            });
            throw error;
        }
    }

    /**
     * Delete subscription
     */
    async deleteSubscription(id: string): Promise<boolean> {
        try {
            const success = await notificationRepository.deleteSubscription(id);

            logger.info({
                msg: 'Subscription deleted',
                id,
                success
            });

            return success;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error deleting subscription',
                error: errorMessage,
                id
            });
            throw error;
        }
    }

    /**
     * Get subscriptions by email
     */
    async getSubscriptionsByEmail(email: string): Promise<SubscriptionResponse[]> {
        try {
            const subscriptions = await notificationRepository.getSubscriptionsByEmail(email);

            // Map to response format with proper typing for health check name
            return Promise.all(subscriptions.map(async (sub) => {
                let healthCheckName = 'All health checks';

                try {
                    if (sub.healthCheckId) {
                        // Handle both string and ObjectId types safely
                        const healthCheckIdStr = typeof sub.healthCheckId === 'string'
                            ? sub.healthCheckId
                            : sub.healthCheckId.toString();

                        // Try to get the health check from repository
                        const healthCheck = await healthCheckRepository.findById(healthCheckIdStr);

                        if (healthCheck) {
                            healthCheckName = healthCheck.name;
                        }
                    }
                } catch (error) {
                    logger.warn({
                        msg: 'Error fetching health check name for subscription list',
                        error: error instanceof Error ? error.message : String(error),
                        subscriptionId: sub.id
                    });
                }

                return {
                    id: sub.id,
                    email: sub.email,
                    healthCheckId: sub.healthCheckId ?
                        (typeof sub.healthCheckId === 'string'
                            ? sub.healthCheckId
                            : sub.healthCheckId.toString())
                        : null,
                    healthCheckName,
                    active: sub.active,
                    severity: sub.severity,
                    verified: !!sub.verifiedAt
                };
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error getting subscriptions by email',
                error: errorMessage,
                email
            });
            throw error;
        }
    }
}

// Export singleton instance
export const notificationService = new NotificationService();